// ADMIN UPLOAD
const uploadForm = document.getElementById("uploadForm");

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const status = document.getElementById("status");
    status.innerText = "Uploading...";

    const formData = new FormData(uploadForm);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.url) {
      let media = JSON.parse(localStorage.getItem("media")) || [];
      media.push(data);
      localStorage.setItem("media", JSON.stringify(media));
      status.innerText = "Upload successful!";
    } else {
      status.innerText = "Upload failed!";
    }
  });
}

// USER HOME DISPLAY
const container = document.getElementById("media-container");

if (container) {
  const media = JSON.parse(localStorage.getItem("media")) || [];

  media.forEach(item => {
    const card = document.createElement("div");
    card.className = "media-card";

    if (item.type === "video") {
      card.innerHTML = `<video src="${item.url}" controls></video>`;
    } else {
      card.innerHTML = `<img src="${item.url}" />`;
    }

    container.appendChild(card);
  });
}
