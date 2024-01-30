import { Request, Response, Router } from "express";
import { CrawlerPsdeals } from "../models/crawlerPs";

const psdealsRouter = Router();

psdealsRouter.get("/", async(req: Request, res: Response): Promise<any> => {
  try{
    if(!req.query.search) return res.status(400).json({pendente: "params SEARCH nao foi identificado"});
    const start = Date.now();
    const crawler = new CrawlerPsdeals(String(req.query.search));
    let dataCrawler = await crawler.getDeals(String(req.query.option));

    return res.status(200).json({
      time: `${(Date.now() - start)/1000} seconds`,
      totalSearch: dataCrawler.length, 
      results: dataCrawler
    });
  }catch(error){
    return res.status(500).json({error: `Internal Server Error => ${error}`});
  }
});

export default psdealsRouter;
