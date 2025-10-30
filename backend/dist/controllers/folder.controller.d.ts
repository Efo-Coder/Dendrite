import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getAllFolders: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFolderById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createFolder: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateFolder: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteFolder: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=folder.controller.d.ts.map