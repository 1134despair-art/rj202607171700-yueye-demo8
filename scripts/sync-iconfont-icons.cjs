const fs = require("node:fs");
const path = require("node:path");

const outputDirectory = path.resolve(__dirname, "../src/assets/ui/iconfont");
const collectionUrl = "https://www.iconfont.cn/api/collection/detail.json?id=19238";

const collectionIcons = {
  add: 34452956,
  calendar: 34452970,
  catalog: 34452798,
  check: 34452984,
  close: 34452988,
  curve: 34452801,
  delete: 34452990,
  document: 34453299,
  down: 34452987,
  download: 34452995,
  edit: 34452981,
  email: 34453208,
  error: 34452967,
  globe: 34453220,
  home: 34453216,
  info: 34453015,
  left: 34453005,
  link: 34453021,
  loading: 34453017,
  location: 34453026,
  lock: 34453011,
  notice: 34453037,
  pause: 34453066,
  phone: 34453244,
  play: 34453036,
  product: 34452947,
  protection: 34453256,
  qr: 34453254,
  refresh: 34452846,
  return: 34453048,
  right: 34453038,
  save: 34453267,
  search: 34453049,
  security: 34453275,
  service: 34453295,
  settings: 34453058,
  shutdown: 34453277,
  success: 34453065,
  translate: 36209395,
  upload: 34453073,
  user: 34452831,
  view: 34453076,
  warning: 34453084,
  wifi: 34453318,
};

const searchIcons = [
  { key: "battery", id: 34413353, query: "电池" },
  { key: "bluetooth", id: 5928198, query: "蓝牙" },
  { key: "motorcycle", id: 9399632, query: "摩托车" },
  { key: "temperature", id: 1305048, query: "温度" },
  { key: "dashboard", id: 3868284, query: "仪表" },
  { key: "diagnosis", id: 1288, query: "诊断" },
];

function cleanSvg(svg, key, source) {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] || "0 0 1024 1024";
  let body = svg.replace(/^.*?<svg[^>]*>/s, "").replace(/<\/svg>.*$/s, "");
  body = body.replace(/\sfill="[^"]*"/g, "").replace(/\sstyle="[^"]*"/g, "");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- Alibaba Iconfont: ${source}; local semantic key: ${key}. -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${body}</svg>`,
    "",
  ].join("\n");
}

async function fetchSearchIcon({ key, id, query }) {
  const response = await fetch("https://www.iconfont.cn/api/icon/search.json", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: query, sortType: "updated_at", page: "1", pageSize: "54", sType: "", fromCollection: "-1", fills: "" }),
  });
  if (!response.ok) throw new Error(`Iconfont search failed for ${query}: ${response.status}`);
  const payload = await response.json();
  const icon = payload.data?.icons?.find((item) => item.id === id);
  if (!icon) throw new Error(`Iconfont result ${id} was not found for ${query}`);
  return { key, icon, source: `search/${query}#${id}` };
}

async function main() {
  const collectionResponse = await fetch(collectionUrl);
  if (!collectionResponse.ok) throw new Error(`Iconfont collection failed: ${collectionResponse.status}`);
  const collectionPayload = await collectionResponse.json();
  const collection = new Map((collectionPayload.data?.icons || []).map((icon) => [icon.id, icon]));
  const selected = Object.entries(collectionIcons).map(([key, id]) => {
    const icon = collection.get(id);
    if (!icon) throw new Error(`Collection icon ${id} (${key}) was not found`);
    return { key, icon, source: `collection/19238/${icon.name}#${id}` };
  });
  selected.push(...await Promise.all(searchIcons.map(fetchSearchIcon)));

  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const item of selected) {
    fs.writeFileSync(path.join(outputDirectory, `${item.key}.svg`), cleanSvg(item.icon.show_svg, item.key, item.source), "utf8");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    collection: "阿里巴巴国际站官方图标库",
    collectionUrl: "https://www.iconfont.cn/collections/detail?cid=19238",
    licenseNote: "The collection is marked public, original and free-to-use on Iconfont. Search additions retain their source id.",
    icons: selected.map(({ key, icon, source }) => ({ key, id: icon.id, name: icon.name, source })),
  };
  fs.writeFileSync(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${selected.length} local Iconfont assets to ${outputDirectory}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
