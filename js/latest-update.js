(() => {
  const card = document.querySelector(".latest-update");
  if (!card) return;

  const avatar = card.querySelector("img");
  const dateLabel = card.querySelector(".latest-update-date");
  const messageLabel = card.querySelector(".latest-update-text");
  const link = card.querySelector("a");

  fetch("data/updates.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load updates (${response.status}).`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.updates) || !data.updates.length) {
        throw new Error("No dated updates were found.");
      }
      const latest = data.updates.slice()
        .sort((first, second) => second.date.localeCompare(first.date))[0];
      if (!latest) throw new Error("No dated updates were found.");

      const content = new DOMParser().parseFromString(latest.messageHtml, "text/html").body.textContent.trim();
      dateLabel.textContent = `LATEST NOTE · ${latest.dateLabel.toUpperCase()}`;
      messageLabel.textContent = content.length > 190
        ? `${content.slice(0, 187).trimEnd()}…`
        : content;
      if (latest.avatar) {
        avatar.src = latest.avatar;
        avatar.hidden = false;
      }
      link.hidden = false;
    })
    .catch((error) => {
      dateLabel.textContent = "LATEST NOTE";
      messageLabel.textContent = error.message;
    });
})();
