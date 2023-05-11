import { Response, Request } from 'express'
import { logger } from '../../shared/logger'

const controller = {
  testFeature: async (req: Request, res: Response): Promise<void> => {
    logger.info(req)
    res.status(200).send({ success: true })
  },
}

export default controller
