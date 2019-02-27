// get/setNested inspired by
// https://github.com/mickhansen/dottie.js
export function getNested(obj: any, path: string): any {
  if (obj !== null && path) {
    // Recurse into the object.
    const parts = path.split('.').reverse();
    while (obj != null && parts.length) {
      obj = obj[parts.pop()];
    }
  }
  return obj;
}

export function setNested(obj: any, path: string, value: any): any {
  if (obj != null && path) {
    const pieces = path.split('.');
    const length = pieces.length;
    let current = obj;
    let piece;
    let i;

    for (i = 0; i < length; i++) {
      piece = pieces[i];
      if (i === length - 1) {
        current[piece] = value;
      } else if (!current[piece]) {
        current[piece] = {};
      }
      current = current[piece];
    }
  }

  return obj;
}
