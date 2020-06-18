const chokidar = (window as any).require("chokidar");

export function start() {
  let updatingStyle = false,
    count = 1;
  const links = [...document.querySelectorAll("link[rel=stylesheet]")];
  function updateLinks() {
    links.forEach((link: HTMLLinkElement, index: number) => {
      const href =
        (link as any)._href ||
        ((link as any)._href = link.getAttribute("href"));
      updatingStyle = true;
      setTimeout(() => {
        updatingStyle = false;
      }, 2000);
      const newLink = document.createElement("link");
      newLink.rel = "stylesheet";
      newLink.href = href + "?" + count++;
      (newLink as any)._href = (link as any)._href || href;
      newLink.onload = () => {
        (link.parentNode as HTMLElement).removeChild(link);
        link = newLink;
      };
      (link.parentNode as HTMLElement).insertBefore(newLink, link);
      links[index] = newLink;
    });
  }

  chokidar
    .watch("./src/", { ignoreInitial: true })
    .on("all", (_: string, name: string) => {
      if (name.match(/\.s?css$/)) {
        updateLinks();
      }
    });
}
