// ============================================================
//  DATA LAYER — simulasi pointer C++ dalam JavaScript
//  Data source: API backend via api.js
// ============================================================

let inventaris = [];
let selectedId = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPointerAddr(index = 0) {
  const base = 0x8a00;
  return `0x${(base + index * 0x40).toString(16).toUpperCase()}`;
}

function normalizeBook(book, index = 0) {
  const rawId = book?._id ?? book?.id ?? index + 1;
  const parsedId = Number.parseInt(rawId, 10);

  return {
    id: Number.isNaN(parsedId) ? index + 1 : parsedId,
    judul: book?.judul ?? "",
    pengarang: book?.pengarang ?? "",
    stok: Number.parseInt(book?.stok, 10) || 0,
    addr: book?.addr || formatPointerAddr(index),
    gambar: book?.gambar || "",
  };
}

function calculateStats(books) {
  return {
    total_buku: books.length,
    total_stok: books.reduce((sum, book) => sum + book.stok, 0),
    stok_kritis: books.filter((book) => book.stok <= 3).length,
  };
}

function log(html) {
  const el = document.getElementById("ptr-log");
  if (!el) return;

  const entry = document.createElement("span");
  entry.className = "log-entry";
  entry.innerHTML = html;
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;

  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function setHeaderStats(stats) {
  const totalBuku = document.getElementById("total-buku");
  const totalStok = document.getElementById("total-stok");
  const stokLowCount = document.getElementById("stok-low-count");

  if (totalBuku) totalBuku.textContent = stats.total_buku ?? 0;
  if (totalStok) totalStok.textContent = stats.total_stok ?? 0;
  if (stokLowCount) stokLowCount.textContent = stats.stok_kritis ?? 0;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setEmptyDetail(message = "Pilih Buku dari Tabel") {
  const card = document.getElementById("detail-card");
  if (!card) return;

  card.classList.add("empty");
  card.innerHTML = `<span class="detail-placeholder">${escapeHtml(message)}</span>`;
}

function render() {
  const searchInput = document.getElementById("search");
  const list = document.getElementById("book-list");
  if (!searchInput || !list) return;

  const query = searchInput.value.toLowerCase();
  const filtered = inventaris.filter(
    (book) =>
      book.judul.toLowerCase().includes(query) ||
      book.pengarang.toLowerCase().includes(query),
  );

  if (!filtered.length) {
    list.innerHTML =
      '<div class="empty-state">// tidak ada data ditemukan</div>';
    return;
  }

  list.innerHTML = filtered
    .map((book) => {
      const stokClass =
        book.stok === 0
          ? "stok-empty"
          : book.stok <= 3
            ? "stok-low"
            : "stok-ok";
      const isSelected = selectedId === book.id;
      const coverMarkup = book.gambar
        ? `<img class="book-cover" src="${book.gambar}" alt="Cover ${escapeHtml(book.judul)}" onerror="this.style.display='none'" />`
        : '<div class="book-cover no-cover">📖</div>';

      return `
        <div class="book-row ${isSelected ? "selected" : ""}" data-id="${book.id}">
          <span class="book-id">#${book.id}</span>
          ${coverMarkup}
          <div>
            <div class="book-title">${escapeHtml(book.judul)}</div>
            <div class="book-author">${escapeHtml(book.pengarang)}</div>
          </div>
          <span class="ptr-badge ${isSelected ? "green" : ""}">${escapeHtml(book.addr)}</span>
          <span class="stok-badge ${stokClass}">${book.stok}</span>
          <button class="action-btn" data-edit="${book.id}">Edit</button>
        </div>`;
    })
    .join("");
}

function renderDetail(id, { logSelection = true } = {}) {
  const card = document.getElementById("detail-card");
  const target = inventaris.find((book) => book.id === id);

  if (!card || !target) {
    selectedId = null;
    setEmptyDetail();
    render();
    return;
  }

  selectedId = id;
  const stokClass =
    target.stok === 0
      ? "stok-empty"
      : target.stok <= 3
        ? "stok-low"
        : "stok-ok";

  if (logSelection) {
    log(
      `<span class="log-ptr">selectedPtr</span> <span class="log-op">=</span> <span class="log-addr">${escapeHtml(target.addr)}</span>`,
    );
  }

  card.classList.remove("empty");
  card.innerHTML = `
    ${
      target.gambar
        ? `
      <div class="detail-image-wrap">
        <img class="detail-image" src="${target.gambar}" alt="Cover ${escapeHtml(target.judul)}" onerror="this.style.display='none'" />
      </div>
    `
        : `
      <div class="detail-image-wrap">
        <div class="detail-no-image">📖</div>
      </div>
    `
    }
    <div class="detail-title">${escapeHtml(target.judul)}</div>
    <div class="detail-author">${escapeHtml(target.pengarang)}</div>
    <div class="detail-row"><span class="detail-key">ID</span><span style="font-family:var(--mono);font-size:12px">#${target.id}</span></div>
    <div class="detail-row"><span class="detail-key">Pointer addr</span><span class="ptr-badge">${escapeHtml(target.addr)}</span></div>
    <div class="detail-row"><span class="detail-key">Stok saat ini</span><span class="stok-badge ${stokClass}">${target.stok}</span></div>
    <div class="divider detail-gap"></div>
    <div class="detail-hint">buku-&gt;stok = ...</div>
    <div class="stok-controls">
      <input class="edit-stk" type="number" id="edit-stok" value="${target.stok}" min="0" />
      <button class="btn-sm" id="btn-save-stok">Simpan</button>
      <button class="btn-danger" id="btn-delete">Hapus</button>
    </div>
  `;

  const saveButton = document.getElementById("btn-save-stok");
  const deleteButton = document.getElementById("btn-delete");

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      const newStok = Number.parseInt(
        document.getElementById("edit-stok").value,
        10,
      );

      if (Number.isNaN(newStok) || newStok < 0) {
        showToast("Stok tidak valid");
        return;
      }

      try {
        const updated = await updateBookStok(target.id, newStok);
        log(
          `<span class="log-op">updateStok()</span> <span class="log-ptr">buku-&gt;stok</span> <span class="log-info">@ <span class="log-addr">${escapeHtml(target.addr)}</span></span>`,
        );
        log(
          `<span class="log-info">  ${target.stok}</span> <span class="log-op">→</span> <span class="log-val">${updated.stok}</span>`,
        );

        await loadBooks({ preserveSelection: true });
        showToast("Stok diperbarui");
      } catch (error) {
        console.error("Error updating book:", error);
      }
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      try {
        await deleteBook(target.id);
        log(
          `<span class="log-op">hapusBuku()</span> <span class="log-info">free pointer</span> <span class="log-addr">${escapeHtml(target.addr)}</span>`,
        );
        log('<span class="log-info">  array shift: alamat di-realokasi</span>');

        selectedId = null;
        setEmptyDetail();
        await loadBooks();
        showToast("Buku dihapus");
      } catch (error) {
        console.error("Error deleting book:", error);
      }
    });
  }

  render();
}

async function loadBooks({ preserveSelection = false } = {}) {
  try {
    const books = await getAllBooks();
    inventaris = books.map((book, index) => normalizeBook(book, index));
    setHeaderStats(calculateStats(inventaris));

    const selectionExists =
      selectedId !== null && inventaris.some((book) => book.id === selectedId);

    if (preserveSelection && selectionExists) {
      renderDetail(selectedId, { logSelection: false });
    } else {
      if (!selectionExists && selectedId !== null) {
        selectedId = null;
        setEmptyDetail();
      }
      render();
    }

    log('<span class="log-info">// inventaris[] loaded from MongoDB</span>');
    log(
      `<span class="log-ptr">Buku*</span> <span class="log-info">base addr =</span> <span class="log-addr">${formatPointerAddr(0)}</span>`,
    );

    if (inventaris.length > 0) {
      log(
        `<span class="log-info">// ${inventaris.length} documents found</span>`,
      );
    } else {
      log(
        '<span class="log-info">// inventaris[] is empty, jalankan seedData() di console browser jika perlu</span>',
      );
    }
  } catch (error) {
    console.error("Error loading books:", error);
    setHeaderStats(calculateStats(inventaris));
    render();
    log(
      '<span class="log-info">// Failed to load from MongoDB, check server connection</span>',
    );
  }
}

async function handleAddBook() {
  const judul = document.getElementById("f-judul")?.value.trim();
  const pengarang = document.getElementById("f-pengarang")?.value.trim();
  const stok = Number.parseInt(document.getElementById("f-stok")?.value, 10);
  const imageInput = document.getElementById("f-image");
  const preview = document.getElementById("image-preview");
  const imageFile = imageInput?.files?.[0];

  if (!judul || !pengarang || Number.isNaN(stok) || stok < 0) {
    showToast("Isi data buku dengan benar");
    return;
  }

  try {
    const gambar =
      imageFile && imageFile.type.startsWith("image/")
        ? await fileToBase64(imageFile)
        : "";
    const newBook = await addBook(judul, pengarang, stok, gambar);

    log(
      `<span class="log-op">tambahBuku()</span> <span class="log-info">allocated at ${escapeHtml(newBook.addr || formatPointerAddr(inventaris.length))}</span>`,
    );

    document.getElementById("f-judul").value = "";
    document.getElementById("f-pengarang").value = "";
    document.getElementById("f-stok").value = "5";
    if (imageInput) imageInput.value = "";
    if (preview) {
      preview.style.display = "none";
      preview.src = "";
    }

    await loadBooks({ preserveSelection: selectedId !== null });
    showToast("Buku ditambahkan");
  } catch (error) {
    console.error("Error adding book:", error);
  }
}

function handleImagePreview(event) {
  const file = event.target.files?.[0];
  const preview = document.getElementById("image-preview");

  if (!preview) return;

  if (file && file.type.startsWith("image/")) {
    fileToBase64(file)
      .then((base64) => {
        preview.src = base64;
        preview.style.display = "block";
      })
      .catch(() => {
        preview.style.display = "none";
      });
  } else {
    preview.style.display = "none";
  }
}

function handleBookListClick(event) {
  const row = event.target.closest(".book-row");
  if (!row) return;

  const id = Number.parseInt(row.dataset.id, 10);
  if (!Number.isNaN(id)) {
    renderDetail(id);
  }
}

function initSplash() {
  const splashScreen = document.getElementById("splash-screen");
  if (!splashScreen) return;

  setTimeout(() => {
    splashScreen.classList.add("hide");
    setTimeout(() => splashScreen.remove(), 1000);
  }, 3000);
}

function init() {
  initSplash();

  const imageInput = document.getElementById("f-image");
  const addButton = document.getElementById("btn-add");
  const searchInput = document.getElementById("search");
  const bookList = document.getElementById("book-list");

  if (imageInput) imageInput.addEventListener("change", handleImagePreview);
  if (addButton) addButton.addEventListener("click", handleAddBook);
  if (searchInput) searchInput.addEventListener("input", render);
  if (bookList) bookList.addEventListener("click", handleBookListClick);

  loadBooks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
