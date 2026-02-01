/* =========================
   ADMIN PAGE LOGIC
========================= */

const uploadForm = document.getElementById("uploadForm");
const adminMedia = document.getElementById("admin-media");
const container = document.getElementById("mediaContainer");

function getMedia() {
  return JSON.parse(localStorage.getItem("media")) || [];
}

function saveMedia(media) {
  localStorage.setItem("media", JSON.stringify(media));
}

function loadAdminMedia() {
  if (!adminMedia) return;

  adminMedia.innerHTML = "";
  const media = getMedia();

  if (media.length === 0) {
    adminMedia.innerHTML = "<p style='color:gray'>No uploads yet</p>";
    return;
  }

  media.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "media-card";

    let content = "";
    if (item.type === "video") {
      content = `<video src="${item.url}" controls></video>`;
    } else if (item.type === "image") {
      content = `<img src="${item.url}">`;
    } else {
      content = `<a href="${item.url}" target="_blank">Open File</a>`;
    }

    card.innerHTML = `
      ${content}
      <button class="delete-btn">Delete</button>
    `;

    card.querySelector(".delete-btn").onclick = async () => {
      if (!confirm("Delete permanently?")) return;

      const res = await fetch(`/api/delete/${item.public_id}/${item.type}`,
        { method: "DELETE" }
        );


      const data = await res.json();

      if (data.success) {
        media.splice(index, 1);
        saveMedia(media);
        loadAdminMedia();
      } else {
        alert("Delete failed");
      }
    };

    adminMedia.appendChild(card);
  });
}

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(uploadForm);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.url) {
      const media = getMedia();
      media.push(data);
      saveMedia(media);
      loadAdminMedia();
      uploadForm.reset();
    } else {
      alert("Upload failed");
    }
  });

  loadAdminMedia();
}

/* =========================
   HOME PAGE LOGIC
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("media-container");
  if (!container) return;

  const media = getMedia();

  if (media.length === 0) {
    container.innerHTML = "<p style='color:gray'>No media available</p>";
    return;
  }

  media.forEach(item => {
    const card = document.createElement("div");
    card.className = "media-card";

    if (item.type === "video") {
      card.innerHTML = `<video src="${item.url}" controls></video>`;
    } else if (item.type === "image") {
      card.innerHTML = `<img src="${item.url}">`;
    } else {
      card.innerHTML = `<a href="${item.url}" target="_blank">Download</a>`;
    }

    container.appendChild(card);
  });
});

async function loadMedia() {
  try {
    const res = await fetch("/api/media", { cache: "no-store" });
    const data = await res.json();

    mediaContainer.innerHTML = "";

    if (data.length === 0) {
      mediaContainer.innerHTML = "<p>No content available</p>";
      return;
    }

    data.forEach(item => {
      if (item.type === "image") {
        const img = document.createElement("img");
        img.src = item.url;
        img.className = "media-item";
        mediaContainer.appendChild(img);
      }

      if (item.type === "video") {
        const video = document.createElement("video");
        video.src = item.url;
        video.controls = true;
        video.className = "media-item";
        mediaContainer.appendChild(video);
      }
    });
  } catch (err) {
    console.error("Error loading media", err);
  }
}

/* 🔁 Load immediately */
loadMedia();

/* 🔁 Auto refresh every 5 seconds */
setInterval(loadMedia, 5000);
