async function loadFiles() {
  const res = await fetch("/files");
  const files = await res.json();

  const container = document.getElementById("files");
  container.innerHTML = "";

  files.forEach(file => {
    container.innerHTML += `
      <div>
        <a href="${file.url}" target="_blank">${file.title}</a>
      </div>
    `;
  });
}

loadFiles();
