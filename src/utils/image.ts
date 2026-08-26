// Loads an image and resolves only once the bytes are actually decodable, so a
// 404/429/HTML error page can't masquerade as a usable picture.
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error("image decoded to zero size"));
        return;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}
