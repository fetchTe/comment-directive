/* eslint-disable */
declare module 'qjs:std' {
  // Exit the process.
  export function exit(n: number): void;

  /** evalScript option parameter object
     * @param backtrace_barrier Boolean (default = false). If true, error backtraces do not list the stack frames below the evalScript.
     * @param async Boolean (default = false). If true, await is accepted in the script and a promise is returned. The promise is resolved with an object whose value property holds the value returned by the script.
     */
  type evalOptions = {
    backtrace_barrier: boolean,
    async: boolean
  };
  // Evaluate the string str as a script (global eval)
  export function evalScript(str: string, options?: evalOptions): any;

  // Evaluate the file filename as a script (global eval).
  export function loadScript(filename: string): any;

  /** loadFile option parameter object
     * @param binary Boolean (default = false). If true, a Uint8Array is returned instead of string.
     */
  type loadFileOptions = {
    binary: boolean
  };

    type TypedArray =
        | Int8Array
        | Uint8Array
        | Uint8ClampedArray
        | Int16Array
        | Uint16Array
        | Int32Array
        | Uint32Array
        | Float32Array
        | Float64Array
        | BigInt64Array
        | BigUint64Array;

    // Load the file filename and return it as a string assuming UTF-8 encoding. Return null in case of I/O error.
    export function loadFile(filename: string, options?: loadFileOptions): Uint8Array | string | null;

    export function writeFile(filename: string, data: string | TypedArray | ArrayBuffer | undefined);

    // string opening mode
    enum openFileFlags {
      'r', 'w', 'a', 'r+', 'w+', 'a+',
      'rb', 'wb', 'ab', 'rb+', 'wb+', 'ab+',
    }
    export const SEEK_SET: number;
    export const SEEK_CUR: number;
    export const SEEK_END: number;

    enum seekflag {
      SEEK_SET,
      SEEK_CUR,
      SEEK_END,
    }

    // File object.
    export type File = {
      // Close the file. Return 0 if OK or -errno in case of I/O error.
      close(): number;
      // Outputs the string with the UTF-8 encoding.
      puts(str: string): void;
      /*
          Formatted printf.
          The same formats as the standard C library printf are supported.
          Integer format types (e.g. %d) truncate the Numbers or BigInts to 32 bits.
          Use the l modifier (e.g. %ld) to truncate to 64 bits.
        */
      printf(fmt: string, ...args: any[]): void;
      // Flush the buffered file.
      flush(): void;
      // Seek to a give file position (whence is std.SEEK_*). offset can be a number or a BigInt. Return 0 if OK or -errno in case of I/O error
      seek(offset: number, whence: seekflag): number;
      // Return the current file position.
      tell(): number;
      // Return the current file position as a BigInt.
      tello(): bigint;
      // Return true if end of file.
      eof(): boolean;
      // Return the associated OS handle.
      fileno(): number;
      // Return true if there was an error.
      error(): boolean;
      // Clear the error indication.
      clearerr(): void;
      // Read length bytes from the file to the ArrayBuffer buffer at byte position position (wrapper to the libc fread)
      read(buffer: ArrayBuffer, position: number, length: number): number;
      // Write length bytes to the file from the ArrayBuffer buffer at byte position position (wrapper to the libc fwrite).
      write(buffer: ArrayBuffer, position: number, length: number): number;
      // Return the next line from the file, assuming UTF-8 encoding, excluding the trailing line feed.
      getline(): string;
      // Read max_size bytes from the file and return them as an ArrayBuffer. If max_size is not present, the file is read until its end.
      readAsArrayBuffer(max_size?: number): ArrayBuffer;
      // Read max_size bytes from the file and return them as a string assuming UTF-8 encoding. If max_size is not present, the file is read until its end.
      readAsString(max_size?: number): string;
      // Return the next byte from the file. Return -1 if the end of file is reached.
      getByte(): number;
      // Write one byte to the file.
      putByte(c: number): number;
    };

    type filehandle = number;

    // Open a file (wrapper to the libc fopen()). Return the FILE object or null in case of I/O error. If errorObj is not undefined, set its errno property to the error code or to 0 if no error occurred.
    export function open(filename: string, flags: openFileFlags, errorObj?: {errno?: number}): FILE | null;

    // Open a process by creating a pipe (wrapper to the libc popen()). Return the FILE object or null in case of I/O error. If errorObj is not undefined, set its errno property to the error code or to 0 if no error occurred.
    export function popen(command: string, flags: openFileFlags, errorObj?: {errno?: number}): FILE | null;

    // Open a file from a file handle (wrapper to the libc fdopen()). Return the FILE object or nullin case of I/O error. IferrorObjis not undefined, set itserrno` property to the error code or to 0 if no error occurred.
    export function fdopen(fd: filehandle, flags: openFileFlags, errorObj?: {errno?: number}): FILE | null;

    // Open a temporary file. Return the FILE object or null in case of I/O error. If errorObj is not undefined, set its errno property to the error code or to 0 if no error occurred.
    export function tmpfile(errorObj?: {errno?: number}): FILE | null;

    // Equivalent to std.out.puts(str).
    export function puts(str: string): void;

    // Equivalent to std.out.printf(fmt, ...args).
    export function printf(fmt: string, ...args: any[]): void;

    // Equivalent to the libc sprintf().
    export function sprintf(fmt: string, ...args: any[]): string;

    //Wrapper to the libc file stdin
    // export var in: File;

    // Wrapper to the libc file stdout
    export var out: File;

    // Wrapper to the libc file stderr
    export var err: File;

    // Enumeration object containing the integer value of common errors (additional error codes may be defined):
    export enum Error {
      EINVAL,
      EIO,
      EACCES,
      EEXIST,
      ENOSPC,
      ENOSYS,
      EBUSY,
      ENOENT,
      EPERM,
      EPIPE,
    }

    // Return a string that describes the error errno.
    export function strerror(errno: number): string;

    // Manually invoke the cycle removal algorithm. The cycle removal algorithm is automatically started when needed, so this function is useful in case of specific memory constraints or for testing.
    export function gc(): void;

    // Return the value of the environment variable name or undefined if it is not defined.
    export function getenv(name: string): string | undefined;

    // Set the value of the environment variable name to the string value.
    export function setenv(name: string, value: string): void;

    // Delete the environment variable name.
    export function unsetenv(name: string): void;

    // Return an object containing the environment variables as key-value pairs.
    export function getenviron(): Record<string, string>;

    /** Options object for urlGet
     * @param binary Boolean (default = false). If true, the response is an ArrayBuffer instead of a string. When a string is returned, the data is assumed to be UTF-8 encoded.
     * @param full Boolean (default = false). If true, return the an object contains the properties response (response content), responseHeaders (headers separated by CRLF), status (status code). response is null is case of protocol or network error. If full is false, only the response is returned if the status is between 200 and 299. Otherwise null is returned.
     */
    type urlOptions = {
      binary: boolean,
      full: boolean
    };

    // Download url using the curl command line utility.
    export function urlGet(url: string, options?: urlOptions): void;

}
