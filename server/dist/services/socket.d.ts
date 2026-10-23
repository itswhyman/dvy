import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export declare function initSocket(httpServer: HttpServer): Server;
export declare function getIo(): Server | null;
export declare function getOnlineUserIds(): number[];
export declare function getPresenceList(): Promise<{
    id: number;
    status: string;
}[]>;
