export const loadFile = (fileName: string) => {
  return new Promise((resolve, reject) => {
    let req = new XMLHttpRequest();
    req.open('GET', '/' + fileName, true);
    req.responseType = 'arraybuffer';
    req.onload = function (oEvent) {
      let arrayBuffer = req.response; // Note: not oReq.responseText
      if (arrayBuffer) {
        resolve(arrayBuffer);
      } else {
        reject();
      }
    };
    req.send(null);
  });
}