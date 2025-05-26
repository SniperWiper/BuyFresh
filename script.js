// Manually define available items
const availableItems = [
    { name: 'Orange', price: 0.50 },
    { name: 'Apple', price: 1.00 },
    { name: 'Banana', price: 0.30 },
    { name: 'Mango', price: 1.50 },
    { name: 'Strawberry', price: 0.20 },
    { name: 'Kiwi', price: 0.80 },
    { name: 'Pineapple', price: 2.00 },
    { name: 'Papaya', price: 1.20 },
    { name: 'Watermelon', price: 0.90 }
  ];
  
  // Global variables
  let cart = {};
  let lastDetectedItems = {};
  let isScanMode = true;
  
  const selectBtn = document.getElementById('selectBtn');
  const scanDiv = document.getElementById('scan');
  const buttonContainer = document.getElementById('buttonContainer');
  const scanBtn = document.getElementById('scanBtn');
  const cartBtn = document.querySelector('.bi-cart4'); // Cart icon in navbar
  let originalContent = scanDiv.innerHTML;
  const originalSelectBtn = selectBtn.cloneNode(true);
  let streamImg = null;
  
  // Update the cart dropdown with current cart items
  function updateCartDropdown() {
    const cartDropdownMenu = document.getElementById('cartDropdownMenu');
    cartDropdownMenu.innerHTML = ''; // Clear previous items
    if (Object.keys(cart).length === 0) {
      cartDropdownMenu.innerHTML = '<span class="dropdown-item-text">Cart is empty</span>';
      return;
    }
    Object.entries(cart).forEach(([itemName, { quantity, price }]) => {
      const subtotal = quantity * price;
      const itemEntry = document.createElement('button');
      itemEntry.type = 'button';
      itemEntry.className = 'dropdown-item';
      itemEntry.textContent = `${itemName}: ${quantity} x $${price.toFixed(2)} = $${subtotal.toFixed(2)}`;
      cartDropdownMenu.appendChild(itemEntry);
    });
  }
  
  // Start the live stream for scanning
  function handleUpload() {
    streamImg = document.createElement('img');
    streamImg.id = 'streamImg';
    streamImg.crossOrigin = 'anonymous';
    streamImg.src = 'http://192.168.191.253:8080/cam.mjpeg';
    streamImg.style.width = '100%';
    streamImg.style.height = '100%';
    streamImg.style.objectFit = 'cover';
  
    scanDiv.style.height = '400px';
    scanDiv.style.width = '600px';
    scanDiv.innerHTML = '';
    scanDiv.appendChild(streamImg);
    buttonContainer.style.display = 'flex';
  }
  
  // Back button: Restore the initial state
  document.getElementById('backBtn').addEventListener('click', function() {
    scanDiv.innerHTML = originalContent;
    scanDiv.style.height = 'auto';
    buttonContainer.style.display = 'none';
    const newSelectBtn = originalSelectBtn.cloneNode(true);
    newSelectBtn.addEventListener('click', handleUpload);
    const oldSelectBtn = scanDiv.querySelector('#selectBtn');
    if (oldSelectBtn) {
      oldSelectBtn.replaceWith(newSelectBtn);
    }
    scanBtn.textContent = 'Scan';
    isScanMode = true;
  });
  
  // Scan button: Capture and process the image
  document.getElementById('scanBtn').addEventListener('click', async function() {
    if (isScanMode) {
      const streamImg = document.getElementById('streamImg');
      if (!streamImg) {
        console.error("Stream image not found.");
        return;
      }
  
      // Capture frame from stream
      const canvas = document.createElement('canvas');
      const width = streamImg.naturalWidth || streamImg.width || 600;
      const height = streamImg.naturalHeight || streamImg.height || 400;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(streamImg, 0, 0, width, height);
  
      // Show captured frame with spinner
      const container = document.createElement('div');
      container.className = 'processing-container';
      const capturedImg = document.createElement('img');
      capturedImg.className = 'captured-image';
      capturedImg.src = canvas.toDataURL();
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      container.appendChild(capturedImg);
      container.appendChild(spinner);
      scanDiv.innerHTML = '';
      scanDiv.appendChild(container);
  
      // Convert to Blob and send to the server
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'capture.jpg');
  
        try {
          const response = await fetch('http://localhost:5000/process_image', {
            method: 'POST',
            body: formData
          });
          if (!response.ok) throw new Error('Processing failed');
  
          const data = await response.json();
  
          // Display processed image
          const processedImg = new Image();
          processedImg.src = 'data:image/jpeg;base64,' + data.image;
          processedImg.style.width = '100%';
          processedImg.style.height = '100%';
          scanDiv.innerHTML = '';
          scanDiv.appendChild(processedImg);
  
          // Process detections
          const detections = data.detections;
          const detectedItems = {};
          const unknownItems = [];
          detections.forEach(det => {
            const className = det.class.toLowerCase();
            const matchedItem = availableItems.find(item => className.includes(item.name.toLowerCase()));
            if (matchedItem) {
              const itemName = matchedItem.name;
              if (!detectedItems[itemName]) {
                detectedItems[itemName] = { quantity: 0, price: matchedItem.price };
              }
              detectedItems[itemName].quantity += 1;
            } else {
              unknownItems.push(det.class);
            }
          });
          lastDetectedItems = detectedItems;
  
          // Alert only for unknown items
          if (unknownItems.length > 0) {
            alert(`Some detected objects are not in available items: ${unknownItems.join(', ')}`);
          }
  
          scanBtn.textContent = 'Scan Again';
          isScanMode = false;
        } catch (error) {
          scanDiv.innerHTML = 'Error processing image';
          console.error('Error:', error);
        }
      }, 'image/jpeg', 0.9);
    } else {
      // Restore live stream for scanning again
      scanDiv.innerHTML = '';
      handleUpload();
      scanBtn.textContent = 'Scan';
      isScanMode = true;
    }
  });
  
  // Cart button: Add last detected items to cart and update the dropdown
  cartBtn.addEventListener('click', function() {
    if (Object.keys(lastDetectedItems).length > 0) {
      Object.entries(lastDetectedItems).forEach(([itemName, { quantity, price }]) => {
        if (!cart[itemName]) {
          cart[itemName] = { quantity: 0, price };
        }
        cart[itemName].quantity += quantity;
      });
      updateCartDropdown();
    }
  });
  
  // Billing button: Save cart and redirect to the billing page
  document.getElementById('billingBtn').addEventListener('click', function() {
    localStorage.setItem('cart', JSON.stringify(cart));
    window.location.href = 'billing.html';
  });
  
  document.getElementById('selectBtn').addEventListener('click', handleUpload);
  