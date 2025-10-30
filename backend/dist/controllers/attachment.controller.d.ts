import { Request, Response } from 'express';
export declare const uploadAttachment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteAttachment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAttachmentsByNoteId: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=attachment.controller.d.ts.map