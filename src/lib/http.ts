/**
 * Stream a byte array as a response body. Hosts such as Vercel cap buffered function responses
 * at 4.5 MB; streamed responses aren't capped, so evidence packs and files of any size download.
 */
export function byteStream(bytes: Uint8Array, chunkSize = 256 * 1024): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.subarray(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
}
