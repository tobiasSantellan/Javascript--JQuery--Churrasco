let isAuthenticated = false;
const authScreen = document.getElementById("auth-screen");
const productsScreen = document.getElementById("products-screen");
const productList = document.getElementById("product-list");
const loadMoreBtn = document.getElementById("load-more-btn");

let products = []; // Array para almacenar los productos recibidos del backend
let currentIndex = 0; // Índice que lleva la cuenta de los productos mostrados
const productsPerPage = 20; // Cantidad de productos a mostrar por cada "página" o carga

// Mostrar pantalla de autenticación
function showAuthScreen() {
  authScreen.style.display = "flex";
  productsScreen.style.display = "none";
}

// Mostrar pantalla de productos
function showProductsScreen() {
  authScreen.style.display = "none";
  productsScreen.style.display = "block";
  fetchProducts();
}

// Función para manejar la autenticación con AJAX
function authenticateUser(credentials) {
  $.ajax({
    url: "http://vps.churrasco.digital:3000/login",
    method: "POST",
    data: credentials,
    success: function (response) {
      if (response.token) {
        console.log("Login exitoso");

        // Guardar el token en localStorage
        localStorage.setItem("authToken", response.token);
        isAuthenticated = true;
        renderScreen(); // Cambiar a pantalla de productos
      } else {
        showErrorMessage("Login fallido. No se recibió un token.");
      }
    },
    error: function (xhr, status, error) {
      showErrorMessage("Error en el login: " + error);
    },
  });
}

// Función para mostrar mensajes de error
function showErrorMessage(message) {
  $("#error-message").text(message).show();
}

// Lógica para renderizar la pantalla correcta
function renderScreen() {
  if (isAuthenticated || localStorage.getItem("authToken")) {
    showProductsScreen();
  } else {
    showAuthScreen();
  }
}

// Configuración de los productos recibidos
function setProducts(productsList) {
  products = productsList;
}

// Función para obtener productos desde el backend
function fetchProducts() {
  $.ajax({
    url: "http://vps.churrasco.digital:3000/products",
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("authToken"),
    },
    success: function (response) {
      if (response && Array.isArray(response)) {
        setProducts(response);
        renderProducts();
      } else {
        alert("No se pudieron cargar los productos.");
      }
    },
    error: function (xhr, status, error) {
      console.error("Error al obtener productos: " + error);
      alert("Error al cargar productos.");
    },
  });
}

// Renderizar productos en la pantalla
function renderProducts() {
  const nextProducts = products.slice(
    currentIndex,
    currentIndex + productsPerPage
  );
  nextProducts.forEach((product) => {
    const genericImage = "https://via.placeholder.com/150";
    const productImageUrl =
      product.pictures && product.pictures.length > 0
        ? product.pictures[0]
        : genericImage;

    // Crear elemento de imagen para verificar si la URL es válida
    const img = new Image();
    img.src = productImageUrl;

    img.onload = function () {
      renderProductCard(product, productImageUrl);
    };

    img.onerror = function () {
      renderProductCard(product, genericImage);
    };
  });

  currentIndex += productsPerPage;

  if (currentIndex >= products.length) {
    loadMoreBtn.style.display = "none";
  }
}

// Renderizar tarjeta de producto
function renderProductCard(product, imageUrl) {
  const productCard = `
    <div class="col-12 col-md-6 col-lg-3 mb-4">
        <div class="card">
            <h5 class="card-title">${product.name}</h5>
            <img src="${imageUrl}" class="card-img-top" alt="${product.name}">
            <div class="card-body">
            <p class="card-text">${product.description}</p>
            <p class="card-price">$${product.price} ${product.currency}</p>
            </div>
        </div>
    </div>
      `;
  $("#product-list").append(productCard);
}

// Manejo de la acción de iniciar sesión
$("#loginForm").submit(function (event) {
  event.preventDefault();
  const username = $("#username").val();
  const password = $("#password").val();
  const credentials = { username, password };
  authenticateUser(credentials);
});

// Función para subir la imagen a Cloudinary
function uploadImage(file) {
  try {
    console.log("Subiendo imagen...", file);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "my_upload_preset");
    return $.ajax({
      url: "https://api.cloudinary.com/v1_1/dg3kxc83f/image/upload", // Cloud Name
      type: "POST",
      data: formData,
      contentType: false,
      processData: false,
    });
  } catch (error) {
    console.log("error", error);
  }
}

// Función para manejar el cambio de imagen en el formulario
function handleImageChange() {
  $("#product-images").on("change", async function () {
    const files = this.files;
    console.log("Archivos seleccionados:", files);
    const cloudinaryImage = await uploadImage(files[0]);
    console.log("Imagen subida:", cloudinaryImage);

    const imageUrl = cloudinaryImage.secure_url;
    console.log("URL de la imagen:", imageUrl);
    $("#form-group").append(
      `<img src="${imageUrl}" id="uploaded-image" alt="Imagen subida"/> `
    ); // Mostrar la URL
  });
}

// Función para manejar el envío del formulario de productos
function handleProductFormSubmit() {
  $("#product-form").on("submit", function (e) {
    console.log("Enviando formulario...");
    e.preventDefault(); // Prevenir el envío del formulario

    const token = localStorage.getItem("authToken");

    const productName = $("#product-name").val();
    const productDescription = $("#product-description").val();
    const productPrice = $("#product-price").val();
    const productCurrency = $("#product-currency").val();
    const files = $("#product-images")[0].files; // Obtener los archivos seleccionados

    // Validación de campos
    if (!productName || !productPrice || files.length === 0) {
      alert("Por favor, completa todos los campos requeridos.");
      return;
    }

    // Crear un array para almacenar las URLs de las imágenes
    const imageUrls = [];
    const uploadPromises = []; // Array para almacenar las promesas de carga

    for (let i = 0; i < files.length; i++) {
      // Llamar a la función uploadImage para cada archivo
      const uploadPromise = uploadImage(files[i]).then((response) => {
        console.log("Response:", response);
        imageUrls.push(response.secure_url); // Almacenar la URL de la imagen
        $("#image-urls").append(
          `<p>URL de la imagen: <a href="${response.secure_url}" target="_blank">${response.secure_url}</a></p>`
        ); // Mostrar la URL
      });

      uploadPromises.push(uploadPromise);
    }

    // Esperar a que todas las imágenes se suban
    Promise.all(uploadPromises).then(() => {
      // Enviar los datos del producto al servidor
      const productData = {
        name: productName,
        description: productDescription,
        price: Number(productPrice),
        currency: productCurrency,
        pictures: imageUrls, // Usar las URLs de las imágenes
        SKU: "2342232",
        code: 1203,
        __v: 0,
      };

      $.ajax({
        url: "http://vps.churrasco.digital:3000/addproduct",
        method: "POST",
        contentType: "application/json",
        headers: {
          Authorization: "Bearer " + token,
        },
        data: JSON.stringify(productData),
        success: function (response) {
          alert("Producto agregado con éxito!");
          $("#product-form")[0].reset(); // Limpiar el formulario
          $("#image-urls").empty(); // Limpiar las URLs mostradas
          $("#uploaded-image").remove();
        },
        error: function (xhr, status, error) {
          console.error("Error al agregar el producto:", error);
          alert("Error al agregar el producto.");
        },
      });
    });
  });
}

// Manejo de la acción de cargar más productos
loadMoreBtn.addEventListener("click", (e) => {
  e.preventDefault();
  renderProducts();
});

$(document).ready(function () {
  renderScreen();
  handleImageChange();
  handleProductFormSubmit();
});
