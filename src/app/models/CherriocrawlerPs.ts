import { IPsprices } from "../interfaces/psprices";
import puppeteer, { launch } from "puppeteer";
import * as cheerio from 'cheerio';

export class CrawlerPsdeals{
  private link: any = process.env.ALVO_CRAWLER_PSN;
  private busca: string;
  private completeGame = ["JOGO BASE", "PACOTE DO JOGO", "EDIÇÃO PREMIUM"];
  private DLC = ["EXPANSÃO", "PACOTE DE EXPANSÕES"];



  constructor(busca: string){
    this.busca = busca;
  }

  public async getDeals(option:any = null): Promise<IPsprices[]>{
    let deals = await this.screppingCher();
    let response = deals;
    // let i = 2;
    // while(deals.length){
    //   deals = await this.scrapping(i);
    //   response = [...response, ...deals]
    //   i++;
    // }

    response = await this.filter(response, option);

    return response;
  }

  private async filter(deals: IPsprices[], option: string): Promise<IPsprices[]>{
    if(option == "jogo completo") deals = deals.filter(deal => this.completeGame.includes(deal.type))
    return deals;
  }

  private async screppingCher(index = 1): Promise<IPsprices[]>
  {
    const response = await fetch(`${this.link}/${this.busca}/1`);
    const body = await response.text();
    
    //carregando dados da pagina com o cheerio
    const $ = cheerio.load(body);
    const elements = $('section[data-qa^="search#productTile"][data-qa$="#details"]');

    //@TODO: Se eu removo o _i a função quebra, porque?
    const dataCrawler =  elements.map((_i, el) => {
        let type = $(el).find("span[data-qa^='search#'][data-qa$='type']")?.text() || "JOGO BASE";
        let name = $(el).find("span[data-qa^='search#'][data-qa$='name']")?.text() || null;
        let price = $(el).find("span[data-qa^='search#'][data-qa$='price']")?.text() || null;

        return {type: type, name: name, price: this.getPreco(price), page: index};

    }).get() as IPsprices[];

    return dataCrawler;
  }

  private getPreco(price: any): Number{
    if(!price) return 0;
    let cleanPrice = price.replace(',', '.').replace(/[^\d.]/g, '');
    return cleanPrice === "" ? 0 : Number(cleanPrice);
  }

  private async scrapping(index=1): Promise<IPsprices[]>{
    let browser = await launch({
      headless: 'new',
      args: [
          "--disable-setuid-sandbox",
          "--no-sandbox",
          "--single-process",
          "--no-zygote"
      ],
      executablePath: process.env.NODE_ENV == "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath()
    });
    
    let page = await browser.newPage();

    //Acessa o endereco e aguarda que todas as tarefas de network estejam completas antes de crawlear
    await page.goto(`${this.link}/${this.busca}/${index}`, {
      waitUntil: "networkidle0",
      timeout: 0
    });

    await page.screenshot({path: "screenshot_page.png"});

    let pageContent = await page.evaluate(() => {
      function getPreco(price: string): Number{
        if(!price) return 0;
        let cleanPrice = price.replace(',', '.').replace(/[^\d.]/g, '');
        return cleanPrice === "" ? 0 : Number(cleanPrice);
      }

      //Capturando a pagina do jogo
      const urlSegments = window.location.pathname.split('/');
      const pageId = urlSegments[urlSegments.length - 1];

      //Procure todas as divs que comecam com "search#productTile" e terminam com "details"
      const divs = [...document.querySelectorAll('section[data-qa^="search#productTile"][data-qa$="#details"]')];

      //Chegou ao fim da busca
      if(!divs.length) return divs;

      //Para cada div, captura os dados dos jogos
      return divs.map((el: any) => {
        let type = el.querySelector("span[data-qa^='search#'][data-qa$='type']")?.innerText || "JOGO BASE";
        let name = el.querySelector("span[data-qa^='search#'][data-qa$='name']")?.innerText || null;
        let price = el.querySelector("span[data-qa^='search#'][data-qa$='price']")?.innerText || null;

        return {type: type, name: name, price: getPreco(price), page: Number(pageId)};
      });
    }) as IPsprices[];

    await browser.close();
    return pageContent;
  }
}