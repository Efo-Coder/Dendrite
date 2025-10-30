import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getAllTags: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTagById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createTag: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTag: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTag: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=tag.controller.d.ts.map