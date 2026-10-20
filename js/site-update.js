(() => {
  const label = document.getElementById("site-updated");
  if (!label) return;

  fetch("https://api.github.com/repos/fexed/fexed.github.io/commits/master", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load website update date (${response.status}).`);
      return response.json();
    })
    .then((commit) => {
      const date = commit.commit?.committer?.date;
      if (!date || !Number.isFinite(Date.parse(date))) {
        throw new Error("GitHub returned an invalid website update date.");
      }
      label.dateTime = date;
      label.textContent = `Last updated ${new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(date))}`;
    })
    .catch((error) => {
      console.warn(error);
    });
})();
