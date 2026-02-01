async function loadFiles() {
  const res = await fetch("/files");
  const files = await res.json();

  const container = document.getElementById("adminFiles");
  container.innerHTML = "";

  files.forEach(file => {
    container.innerHTML += `
      <div>
        ${file.title}
        <button onclick="deleteFile('${file._id}')">Delete</button>
      </div>
    `;
  });
}

document.getElementById("uploadForm").addEventListener("submit", async e => {
  e.preventDefault();

  const formData = new FormData(e.target);

  const res = await fetch("/upload", {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    alert("Upload failed");
    return;
  }

  e.target.reset();
  loadFiles();
});

async function deleteFile(id) {
  const res = await fetch(`/files/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    alert("Delete failed");
    return;
  }

  loadFiles();
}

loadFiles();
