var PNGImage = require('pngjs-image');
var image = PNGImage.createImage(100, 300);
 
// Get width and height 
console.log(image.getWidth());
console.log(image.getHeight());
 
// Set a pixel at (20, 30) with red, having an alpha value of 100 (half-transparent) 
image.setAt(20, 30, { red:255, green:0, blue:0, alpha:100 });
 
// Get index of coordinate in the image buffer 
var index = image.getIndex(20, 30);
 
// Print the red color value 
console.log(image.getRed(index));
 
// Get low level image object with buffer from the 'pngjs' package 
var pngjs = image.getImage();
 
image.writeImage('./i.png', function (err) {
    if (err) throw err;
    console.log('Written to the file');
});
