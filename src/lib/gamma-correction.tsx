import * as d3 from "./d3";

/**
 * Apply gamma correction to an image.
 * Both `image_data` and `output_data` come from the `ImageData.data` property.
 * Each one is a `Uint8ClampedArray` of 8-bit integers,
 * with the red channel first, then green, then blue, then alpha.
 */
export default function gamma_correction({
  input_data,
  output_data,
  gamma_exponent,
}: {
  input_data: ImageData["data"];
  output_data: ImageData["data"];
  gamma_exponent: number;
}) {
  const gamma_inverse = 1 / gamma_exponent;
  // Create a lookup table for gamma correction.
  const gamma_table = d3
    .range(256)
    .map((i) => (i / 255) ** gamma_inverse * 255);
  // Loop through every four elements, one for each channel.
  for (let i = 0; i < input_data.length; i += 4) {
    const r = input_data[i];
    const g = input_data[i + 1];
    const b = input_data[i + 2];
    const alpha = input_data[i + 3];
    output_data[i] = gamma_table[r];
    output_data[i + 1] = gamma_table[g];
    output_data[i + 2] = gamma_table[b];
    output_data[i + 3] = alpha;
  }
  return output_data;
}
