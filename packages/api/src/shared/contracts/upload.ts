/** A file received over multipart, buffered and normalized by `@UploadedFile`. */
export interface UploadedFile{
    filename: string;
    buffer: Buffer;
}
