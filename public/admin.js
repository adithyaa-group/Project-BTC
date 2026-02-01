document.getElementById("uploadForm").onsubmit = async e => {
  e.preventDefault();

  const formData = new FormData(e.target);
  await fetch("/upload", {
    method: "POST",
    body: formData
  });

  e.target.reset();
  loadFiles();
};

async function loadFiles() {
  const res = await fetch("/files");
  const files = await res.json();

  const list = document.getElementById("adminFiles");
  list.innerHTML = "";

  files.forEach(file => {
    list.innerHTML += `
      <div>
        ${file.title}
        <button onclick="deleteFile('${file._id}')">Delete</button>
      </div>
    `;
  });
}

async function deleteFile(id) {
  await fetch(`/files/${id}`, { method: "DELETE" });
  loadFiles();
}

loadFiles();
