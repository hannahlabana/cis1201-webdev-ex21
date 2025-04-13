const express = require('express');
const sql = require('mssql');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

// Database configuration
const config = {
    user: 'hannahlabana',
    password: 'Maviswendy1!',
    server: 'webdev-grocery.database.windows.net',
    database: 'grocery',
    port: 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Connect to database
async function connectToDatabase() {
    try {
        await sql.connect(config);
        console.log('✅ Database connection established');
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
}

// Create tables
async function createTables() {
    try {
        const request = new sql.Request();
        
        // Create Products table
        const productsQuery = `
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
            BEGIN
                CREATE TABLE Products (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    image NVARCHAR(255),
                    type NVARCHAR(50)
                )
                PRINT 'Products table created successfully'
            END
        `;
        
        // Create Cart table
        const cartQuery = `
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Cart')
            BEGIN
                CREATE TABLE Cart (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    product_id INT NOT NULL,
                    quantity INT DEFAULT 1,
                    total DECIMAL(10,2),
                    FOREIGN KEY (product_id) REFERENCES Products(id)
                )
                PRINT 'Cart table created successfully'
            END
        `;
        
        await request.query(productsQuery);
        await request.query(cartQuery);
        console.log('✅ Tables created or already exist');
    } catch (err) {
        console.error('❌ Error creating tables:', err);
    }
}

// Populate Products table with data from external API
async function populateProductsTable() {
    try {
        const response = await fetch('https://mdn.github.io/learning-area/javascript/apis/fetching-data/can-store/products.json');
        const text = await response.text();
        const products = JSON.parse(text);
        
        const checkRequest = new sql.Request();
        const checkQuery = 'SELECT COUNT(*) as count FROM Products';
        const result = await checkRequest.query(checkQuery);
        
        if (result.recordset[0].count === 0) {
            for (const product of products) {
                const insertRequest = new sql.Request();
                const insertQuery = `
                    INSERT INTO Products (name, price, image, type)
                    VALUES (@name, @price, @image, @type)
                `;
                
                insertRequest.input('name', sql.NVarChar, product.name);
                insertRequest.input('price', sql.Decimal(10,2), product.price);
                insertRequest.input('image', sql.NVarChar, product.image);
                insertRequest.input('type', sql.NVarChar, product.type);
                
                await insertRequest.query(insertQuery);
            }
            console.log('✅ Products table populated with', products.length, 'products');
        }
    } catch (err) {
        console.error('❌ Error populating Products table:', err);
    }
}

// API Routes
app.get('/api/products', async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query('SELECT * FROM Products');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/cart', async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query(`
            SELECT c.id, c.quantity, c.total, p.name, p.price, p.image, p.type
            FROM Cart c
            JOIN Products p ON c.product_id = p.id
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

app.post('/api/cart', async (req, res) => {
    try {
        const { product_id, quantity, total } = req.body;

        // First check if the product exists in cart
        const checkRequest = new sql.Request();
        const checkQuery = 'SELECT * FROM Cart WHERE product_id = @product_id';
        checkRequest.input('product_id', sql.Int, product_id);
        const existingItem = await checkRequest.query(checkQuery);

        if (existingItem.recordset.length > 0) {
            // Update existing cart item
            const updateRequest = new sql.Request();
            const updateQuery = `
                UPDATE Cart 
                SET quantity = quantity + 1,
                    total = total + @price
                WHERE product_id = @product_id
            `;
            
            // Get the product price
            const productRequest = new sql.Request();
            const productQuery = 'SELECT price FROM Products WHERE id = @product_id';
            productRequest.input('product_id', sql.Int, product_id);
            const productResult = await productRequest.query(productQuery);
            
            updateRequest.input('price', sql.Decimal(10,2), productResult.recordset[0].price);
            updateRequest.input('product_id', sql.Int, product_id);
            await updateRequest.query(updateQuery);
        } else {
            // Insert new cart item
            const insertRequest = new sql.Request();
            const insertQuery = `
                INSERT INTO Cart (product_id, quantity, total)
                VALUES (@product_id, @quantity, @total)
            `;
            
            insertRequest.input('product_id', sql.Int, product_id);
            insertRequest.input('quantity', sql.Int, quantity);
            insertRequest.input('total', sql.Decimal(10,2), total);
            
            await insertRequest.query(insertQuery);
        }

        res.status(201).json({ message: 'Cart updated successfully' });
    } catch (err) {
        console.error('Error updating cart:', err);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

app.delete('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const request = new sql.Request();
        const query = 'DELETE FROM Cart WHERE id = @id';
        
        request.input('id', sql.Int, id);
        await request.query(query);
        
        res.json({ message: 'Item removed from cart successfully' });
    } catch (err) {
        console.error('Error removing from cart:', err);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize server
async function initializeServer() {
    await connectToDatabase();
    await createTables();
    await populateProductsTable();
    
    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
    });
}

initializeServer(); 