const axios = require("axios");
const fs = require("fs");

// укажите свой вебхук через переменную окружения WEBHOOK, иначе заглушка
const WEBHOOK = process.env.WEBHOOK || "https://example.com/rest/"; // базовый вебхук (заглушка)
const METHOD = "batch.json"; // батч-метод Bitrix24

const TOTAL_NEEDED = 10000; // сколько компаний забрать
const PAGE_SIZE = 50; // размер одной страницы crm.company.list
const CMD_PER_BATCH = 50; // сколько подзапросов в одном batch (максимум 50)

// собираем команды для batch: каждый подзапрос = одна страница по PAGE_SIZE
function buildBatchCommands(startFrom) {
  const cmds = {};
  let offset = startFrom;

  for (let i = 0; i < CMD_PER_BATCH; i++) {
    if (offset >= TOTAL_NEEDED) break;
    const params = new URLSearchParams();
    params.append("start", offset);
    params.append("order[ID]", "ASC");
    params.append("select[]", "ID");
    params.append("select[]", "TITLE");
    params.append("select[]", "PHONE");
    params.append("select[]", "EMAIL");
    params.append("select[]", "COMPANY_TYPE");

    cmds[`c${i}`] = `crm.company.list?${params.toString()}`;
    offset += PAGE_SIZE;
  }

  return { cmds, nextOffset: offset };
}

async function fetchBatch(cmds) {
  const url = `${WEBHOOK}${METHOD}`;
  const res = await axios.post(url, { cmd: cmds });
  return res.data;
}

(async () => {
  let offset = 0;
  let total = 0;
  let batchIndex = 0;
  const collected = []; // сюда собираем все компании для сохранения

  while (total < TOTAL_NEEDED) {
    const { cmds, nextOffset } = buildBatchCommands(offset);
    if (Object.keys(cmds).length === 0) break;

    const data = await fetchBatch(cmds);
    const results = data.result?.result || {};

    Object.values(results).forEach((items) => {
      items.forEach((item) => {
        const phone = item.PHONE?.[0]?.VALUE || "";
        const email = item.EMAIL?.[0]?.VALUE || "";
        console.log(
          `ID=${item.ID} | ${item.TITLE} | phone=${phone} | email=${email} | type=${item.COMPANY_TYPE || ""}`
        );
        total += 1;
        collected.push(item);
      });
    });

    batchIndex += 1;
    offset = nextOffset;
    console.log(`Batch ${batchIndex} done, total loaded: ${total}`);

    // если в batch ничего не вернулось, дальше идти бессмысленно
    if (!Object.values(results).some((items) => items && items.length)) {
      break;
    }
  }

  console.log(`Finished. Loaded ${total} companies.`);

  // сохраняем в JSON с датой/временем в имени
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  const filename = `companies_${stamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(collected, null, 2), "utf8");
  console.log(`Saved to ${filename}`);
})().catch((err) => {
  const details = err.response?.data || err.message;
  console.error("Error:", details);
  process.exit(1);
});

