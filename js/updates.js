(() => {
  const blogArchive = document.getElementById("blog-updates");
  const updatesArchive = document.getElementById("updates-archive");
  const archive = blogArchive || updatesArchive;
  if (!archive) return;

  const imageDialog = document.querySelector(".blog-image-dialog");
  const enlargedImage = imageDialog?.querySelector("img");

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createMessage(update) {
    const fragment = document.createDocumentFragment();
    const date = create("div", "divider d-flex align-items-center mb-4");
    date.append(create("p", "text-center mx-3 mb-0", update.dateLabel));

    const row = create("div", "d-flex flex-row justify-content-start mb-4");
    const avatar = create("img");
    avatar.src = update.avatar;
    avatar.alt = update.avatarAlt || "";
    avatar.style.width = "45px";
    avatar.style.height = "100%";

    const bubble = create("div", "p-3 ms-3");
    bubble.style.borderRadius = "15px";
    bubble.style.backgroundColor = "rgba(66, 66, 66, .2)";
    bubble.innerHTML = update.messageHtml;
    row.append(avatar, bubble);
    fragment.append(date, row);
    return fragment;
  }

  function arrangeUpdateImages(container) {
    if (!imageDialog || !enlargedImage) return;

    for (const bubble of container.querySelectorAll(".d-flex.flex-row > div")) {
      const mediaNodes = new Set();
      for (const image of bubble.querySelectorAll("img")) {
        const link = image.closest("a");
        mediaNodes.add(link && link.parentElement === bubble ? link : image);
      }
      if (!mediaNodes.size) continue;

      const copy = create("div", "blog-message-copy");
      const media = create("div", "blog-message-media");
      for (const child of Array.from(bubble.childNodes)) {
        if (mediaNodes.has(child)) {
          const image = child.matches("img") ? child : child.querySelector("img");
          let link = child;
          if (image === child) {
            link = document.createElement("a");
            link.href = image.src;
            link.append(image);
          }
          link.classList.add("blog-image-link");
          link.dataset.zoomSrc = image.src;
          if (!image.alt || image.alt === "...") image.alt = "Update photo";
          media.append(link);
        } else if (!(child.nodeType === Node.ELEMENT_NODE && child.tagName === "BR")) {
          copy.append(child);
        }
      }
      bubble.classList.add("has-blog-media");
      bubble.replaceChildren(copy, media);
    }
  }

  if (blogArchive && imageDialog && enlargedImage) {
    blogArchive.addEventListener("click", (event) => {
      const link = event.target.closest(".blog-image-link");
      if (!link) return;
      event.preventDefault();
      enlargedImage.src = link.dataset.zoomSrc;
      enlargedImage.alt = link.querySelector("img").alt;
      imageDialog.showModal();
    });

    imageDialog.addEventListener("click", (event) => {
      if (event.target === imageDialog) imageDialog.close();
    });
  }

  fetch("data/updates.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load updates (${response.status}).`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.updates) || data.updates.some((update) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(update.date) ||
        typeof update.dateLabel !== "string" ||
        typeof update.messageHtml !== "string" ||
        typeof update.avatar !== "string"
      )) {
        throw new Error("Update data is not in the expected format.");
      }

      const updates = data.updates
        .map((update, index) => ({ ...update, index }))
        .sort((first, second) => second.date.localeCompare(first.date) || first.index - second.index);
      const groups = new Map();
      for (const update of updates) {
        const year = update.date.slice(0, 4);
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(update);
      }

      const fragment = document.createDocumentFragment();
      for (const [year, yearUpdates] of groups) {
        const section = create("section", "archive-year");
        const titleId = `${blogArchive ? "blog" : "updates"}-${year}-title`;
        const heading = create("h2", "", year);
        heading.id = titleId;
        section.setAttribute("aria-labelledby", titleId);

        const content = create("div", "archive-content");
        for (const update of yearUpdates) content.append(createMessage(update));
        section.append(heading, content);
        fragment.append(section);
      }

      archive.replaceChildren(fragment);
      arrangeUpdateImages(archive);
      archive.removeAttribute("aria-live");
    })
    .catch((error) => {
      archive.textContent = error.message;
    });
})();
