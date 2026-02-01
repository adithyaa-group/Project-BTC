const uploadForm = document.getElementById("uploadForm");
const adminMedia = document.getElementById("admin-media");

function loadAdminMedia() {
  adminMedia.innerHTML = "";
  const media = JSON.parse(localStorage.getItem("media")) || [];

  media.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "media-card";

    div.innerHTML = `
      ${item.type === "video"
        ? `<video src="${item.url}" controls></video>`
        : `<img src="${item.url}" />`
      }
      <button onclick="deleteMedia('${item.public_id}', ${index})">
        Delete
      </button>
    `;

    adminMedia.appendChild(div);
  });
}

async function deleteMedia(publicId, index) {
  if (!confirm("Delete this file permanently?")) return;

  const res = await fetch(`/api/delete/${publicId}`, {
    method: "DELETE"
  });

  const data = await res.json();

  if (data.success) {
    let media = JSON.parse(localStorage.getItem("media")) || [];
    media.splice(index, 1);
    localStorage.setItem("media", JSON.stringify(media));
    loadAdminMedia();
  } else {
    alert("Delete failed");
  }
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

    let media = JSON.parse(localStorage.getItem("media")) || [];
    media.push(data);
    localStorage.setItem("media", JSON.stringify(media));

    loadAdminMedia();
  });

  loadAdminMedia();
}
