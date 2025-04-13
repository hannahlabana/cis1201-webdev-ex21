// Global variables
let productArray = [];
let cartArray = [];

// DOM Elements
const productList = document.getElementsByClassName("product-list")[0];
const cartList = document.getElementsByClassName("cart-list")[0];

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Fetch products from server
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

// Fetch cart items from server
async function fetchCart() {
    try {
        const response = await fetch(`${API_BASE_URL}/cart`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching cart:", error);
        return [];
    }
}

// Add item to cart
async function addToCart(productId) {
    try {
        const product = productArray.find(p => p.id === productId);
        if (!product) return;

        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1,
                total: product.price
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add to cart');
        }

        await updateCartDisplay();
    } catch (error) {
        console.error('Error adding to cart:', error);
    }
}

// Remove item from cart
async function removeCart(cartId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cart/${cartId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to remove from cart');
        }

        await updateCartDisplay();
    } catch (error) {
        console.error('Error removing from cart:', error);
    }
}

// Update cart display
async function updateCartDisplay() {
    cartArray = await fetchCart();
    cartList.innerHTML = '';
    
    cartArray.forEach(item => {
        let cartItem = document.createElement('div');
        cartItem.innerHTML = `
            <div style="display: flex; flex-direction: row; padding: 1vh 1vw; width: auto; height: auto; justify-content: space-between; margin-bottom: 0.5vh;">
                <div>
                    <p style="text-transform: capitalize; font-weight: bold; margin: 0.4vh 0;">${item.name}<span style="margin-left: 0.3vw;">x${item.quantity}</span></p>
                    <p>$${item.price}</p>
                </div>
                <div>
                    <span>$${item.total.toFixed(2)}</span>
                    <input style="margin-left:2vw;" type=button onClick="removeCart(${item.id})" value="x"></input>
                </div>
            </div>
            <hr>
        `;
        cartList.appendChild(cartItem);
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function () {
    // Fetch products and populate the product list
    productArray = await fetchProducts();
    
    // Create product cards
    productArray.forEach(product => {
        let item = document.createElement('div');
        item.innerHTML = `
            <div class="item-card">
                <div style="width: auto; height: 50%; background-color: rgb(190, 190, 190); padding: 8px;">
                    <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div>
                    <p style="font-weight: bold; text-transform: capitalize;">${product.name}</p>
                    <p style="font-weight: bold;">$${product.price}</p>
                    <p style="font-size: 0.8em; color: #666;">${product.type}</p>
                </div>
                <input
                    type="button"
                    onClick="addToCart(${product.id})"
                    class="btn"
                    value="Add to Cart"
                ></input>
            </div>
        `;
        productList.appendChild(item);
    });

    // Initialize cart display
    await updateCartDisplay();
}); 