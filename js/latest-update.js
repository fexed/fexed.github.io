(() => {
  const card = document.querySelector(".latest-update");
  if (!card) return;

  const avatar = card.querySelector("img");
  const dateLabel = card.querySelector(".latest-update-date");
  const messageLabel = card.querySelector(".latest-update-text");
  const link = card.querySelector("a");

  function findLatestEntry(markup, year) {
    const archive = new DOMParser().parseFromString(markup, "text/html");
    const entries = [];

    for (const dateDivider of archive.querySelectorAll(".divider")) {
      const dateText = dateDivider.textContent.trim();
      const timestamp = Date.parse(dateText);
      const message = dateDivider.nextElementSibling;
      if (!Number.isFinite(timestamp) || !message?.matches(".d-flex.flex-row")) continue;

      const bubble = message.querySelector(":scope > div");
      const text = bubble?.querySelector("p")?.textContent.trim();
      if (!text) continue;

      entries.push({
        dateText,
        timestamp,
        text,
        avatar: message.querySelector(":scope > img")?.getAttribute("src") || "",
        year,
      });
    }

    return entries;
  }

  fetch("updates.html", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load the update archive index (${response.status}).`);
      return response.text();
    })
    .then((markup) => {
      const index = new DOMParser().parseFromString(markup, "text/html");
      const years = Array.from(index.querySelectorAll("[id^='updates-']"))
        .map((section) => section.id.slice("updates-".length))
        .filter((year) => /^\d{4}$/.test(year));
      if (!years.length) throw new Error("No update archives are listed.");

      return Promise.all(years.map((year) =>
        fetch(`updates/${year}.html`, { cache: "no-cache" })
          .then((response) => {
            if (!response.ok) throw new Error(`Could not load the ${year} update archive (${response.status}).`);
            return response.text();
          })
          .then((archive) => findLatestEntry(archive, year))
      ));
    })
    .then((archives) => {
      const latest = archives.flat()
        .sort((first, second) => second.timestamp - first.timestamp)[0];
      if (!latest) throw new Error("No dated updates were found.");

      dateLabel.textContent = `LATEST NOTE · ${latest.dateText.toUpperCase()}`;
      messageLabel.textContent = latest.text.length > 190
        ? `${latest.text.slice(0, 187).trimEnd()}…`
        : latest.text;
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
