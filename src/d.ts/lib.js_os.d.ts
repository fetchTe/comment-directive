/* eslint-disable */
declare module 'qjs:os' {
  export const O_RDONLY: number;
  export const O_WRONLY: number;
  export const O_RDWR: number;
  export const O_APPEND: number;
  export const O_CREAT: number;
  export const O_EXCL: number;
  // (Windows specific). Open the file in text mode. The default is binary mode.
  export const O_TEXT: number;

  enum openflag {
    O_RDONLY,
    O_WRONLY,
    O_RDWR,
    O_APPEND,
    O_CREAT,
    O_EXCL,
    O_TEXT,
  }
    type filehandle = number;
    // Open a file. Return a handle or < 0 if error.
    export function open(filename: string, flags: openflag, mode?: number): filehandle;

    enum seekflag {
      SEEK_SET,
      SEEK_CUR,
      SEEK_END,
    }
    // Seek in the file. Use std.SEEK_* for whence. offset is either a number or a BigInt. If offset is a BigInt, a BigInt is returned too.
    export function seek(fd: filehandle, offset: number, whence: seekflag): void;

    // Read length bytes from the file handle fd to the ArrayBuffer buffer at byte position offset. Return the number of read bytes or < 0 if error.
    export function read(fd: filehandle, buffer: ArrayBuffer, offset: number, length: number);

    // Write length bytes to the file handle fd from the ArrayBuffer buffer at byte position offset. Return the number of written bytes or < 0 if error.
    export function write(fd: filehandle, buffer: ArrayBuffer, offset: number, length: number);

    // Return true is fd is a TTY (terminal) handle.
    export function isatty(fd: filehandle): boolean;

    // Return the TTY size as [width, height] or null if not available.
    export function ttyGetWinSize(fd: filehandle): [number, number];

    // Set the TTY in raw mode.
    export function ttySetRaw(fd: filehandle): void;

    // Remove a file. Return 0 if OK or -errno.
    export function remove(filename: string): number;

    // Return [str, err] where str is the canonicalized absolute pathname of path and err the error code.
    export function realpath(path: string): [string, number];

    // Return [str, err] where str is the current working directory and err the error code.
    export function getcwd(): [string, number];

    // Returns the full path of the current executable or undefined if not available / supported.
    export function exePath(): string | undefined;

    // Change the current directory. Return 0 if OK or -errno.
    export function chdir(path: string): number;

    // Create a directory at path. Return 0 if OK or -errno.
    export function mkdir(path: string, mode: number): number;

    export const S_IFMT: number;
    export const S_IFIFO: number;
    export const S_IFCHR: number;
    export const S_IFDIR: number;
    export const S_IFBLK: number;
    export const S_IFREG: number;
    export const S_IFSOCK: number;
    export const S_IFLNK: number;
    export const S_ISGID: number;
    export const S_ISUID: number;

    enum fileStatMode {
      S_IFMT,
      S_IFIFO,
      S_IFCHR,
      S_IFDIR,
      S_IFBLK,
      S_IFREG,
      S_IFSOCK,
      S_IFLNK,
      S_ISGID,
      S_ISUID,
    }

    /** Result for file stat
     * @property dev Integer. ID of device containing file
     * @property ino Integer. inode number
     * @property mode Integer. protection
     * @property nlink Integer. number of hard links
     * @property uid Integer. user ID of owner
     * @property gid Integer. group ID of owner
     * @property rdev Integer. device ID (if special file)
     * @property size Integer. total size, in bytes
     * @property blocks Integer. (non-Windows) number of 512B blocks allocated
     * @property atime Integer. time of last access in ms
     * @property mtime Integer. time of last modificatio in ms
     * @property ctime Integer. time of last status change in ms
     */
    type filestat = {
      dev: number,
      ino: number,
      mode: fileStatMode,
      nlink: number,
      uid: number,
      gid: number,
      rdev: number,
      size: number,
      blocks: number,
      atime: number,
      mtime: number,
      ctime: number
    };
    /*
    Return [obj, err] where obj is an object containing the file status of path. err is the error code.
    The times are specified in milliseconds since 1970. lstat() is the same as stat() excepts that it returns information about the link itself.
    */
    export function stat(path: string): [filestat, number];
    // Same as stat but does not follow links
    export function lstat(path: string): [filestat, number];

    // Change the access and modification times of the file path. The times are specified in milliseconds since 1970. Return 0 if OK or -errno.
    export function utimes(path: string, atime: number, mtime: number): number;

    // Create a link at linkpath containing the string target. Return 0 if OK or -errno.
    export function symlink(target: string, linkpath: string): number;

    // Return [str, err] where str is the link target and err the error code.
    export function readlink(path: string): [string, number];

    // Return [array, err] where array is an array of strings containing the filenames of the directory path. err is the error code.
    export function readdir(path: string): [string, number];

    // Add a read handler to the file handle fd. func is called each time there is data pending for fd. A single read handler per file handle is supported. Use with func = null to remove the handler.
    export function setReadHandler(fd: filehandle, func: null | (()=> undefined)): void;

    // Add a write handler to the file handle fd. func is called each time data can be written to fd. A single write handler per file handle is supported. Use with func = null to remove the handler.
    export function setWriteHandler(fd: filehandle, func: null | (()=> undefined)): void;

    export const SIGINT: number;
    export const SIGABRT: number;
    export const SIGFPE: number;
    export const SIGILL: number;
    export const SIGSEGV: number;
    export const SIGTERM: number;

    // POSIX signal numbers.
    enum signaltype {
      SIGINT,
      SIGABRT,
      SIGFPE,
      SIGILL,
      SIGSEGV,
      SIGTERM,
    }

    // Call the function func when the signal signal happens. Only a single handler per signal number is supported. Use null to set the default handler or undefined to ignore the signal. Signal handlers can only be defined in the main thread.
    export function signal(signal: signaltype, func: null | undefined | (()=> undefined)): void;

    // Send the signal sig to the process pid.
    export function kill(pid: number, sig: signaltype): void;

    /** Options for executing a process.
     * @property block boolean (default = true). If true, wait until the process is terminated. In this case, exec return the exit code if positive or the negated signal number if the process was interrupted by a signal. If false, do not block and return the process id of the child.
     * @property usePath boolean (default = true). If true, the file is searched in the PATH environment variable.
     * @property file String (default = args[0]). Set the file to be executed.
     * @property cwd String. If present, set the working directory of the new process.
     * @property stdin If present, set the handle in the child for stdin.
     * @property stdout If present, set the handle in the child for stdout.
     * @property stderr If present, set the handle in the child for stderr.
     * @property env Object. If present, set the process environment from the object key-value pairs. Otherwise use the same environment as the current process.
     * @property uid Integer. If present, the process uid with setuid.
     * @property gid Integer. If present, the process gid with setgid.
     */
    type execOptions = {
      block: boolean,
      usePath: boolean,
      file: string,
      cwd: string,
      stdin?: number,
      stdout?: number,
      stderr?: number,
      env?: object,
      uid?: number,
      gid?: number
    };

    // Execute a process with the arguments args. options is an object containing optional parameters:
    export function exec(args: number, options?: execOptions): void;

    export const WNOHANG: number;

    /**
     * waitpid Unix system call. Return the array [ret, status]. ret contains -errno in case of error.
     * Options can be 0 or WNOHANG
     */
    export function waitpid(pid: number, options: number): [number, number];

    /**
     * duplicate a file descriptor
     * returns new file descriptor or errno
     */
    export function dup(fd: filehandle): filehandle | number;

    /**
     * duplicate a file descriptor
     * returns newfd or errno
     */
    export function dup2(oldfd: filehandle, newfd: filehandle): filehandle | number;

    // pipe Unix system call. Return two handles as [read_fd, write_fd] or null in case of error.
    export function pipe(): [number, number];

    // Sleep during delay_ms milliseconds.
    export function sleep(delay_ms: number): void;

    // Asynchronouse sleep during delay_ms milliseconds.
    export function sleepAsync(delay_ms: number): Promise<void>;

    // Call the function func after delay ms. Return a timer ID.
    export function setTimeout(func: ()=> {}, delay_ms: number): number;

    // Cancel a timer.
    export function clearTimeout(id: number): number;

    // Return a string representing the platform: "linux", "darwin", "win32" or "js"
    export const platform: string;

    /**
     Constructor to create a new thread (worker) with an API close to that of WebWorkers.
     module_filename is a string specifying the module filename which is executed in the newly created thread.
     As for dynamically imported module, it is relative to the current script or module path.
     Threads normally don't share any data and communicate between each other with messages.
     Nested workers are not supported. An example is available in tests/test_worker.js.
    */
    export class Worker {
      constructor(module_filename: string);
      // In the created worker, Worker.parent represents the parent worker and is used to send or receive messages.
      parent(): void | Worker;
      postMessage(msg: any): void;
      onmessage: undefined | ((data: any)=> {});
    }

}
