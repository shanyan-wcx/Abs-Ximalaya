const express = require('express');
const YAML = require('js-yaml');
const fs = require('fs');
const request = require('sync-request');
const swaggerUi = require('swagger-ui-express');

// 读取 YAML 文件
const yamlFile = fs.readFileSync('./api.yaml', 'utf8');
const swaggerDocument = YAML.load(yamlFile);

const app = express();
const port = 7814;

// 使用 JSON 解析�?间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ encoding: 'utf-8' }));

// 设置 Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  const ok = [
    {
      code: 200,
      message: 'ok',
      description: "Audiobookshelf's Ximalaya Metadata Provider"
    }
  ];
  res.status(200).json(ok);

});

// 搜索书籍
app.get('/search', (req, res) => {
  const { query, author } = req.query;
  var kw;
  var data = [];
  var ret = 200;
  var msg;
  console.log(`开始搜�? - 标�?�：${query}；作者：${author}`);
  if (query) {
    kw = query;
  } else if (author) {
    kw = author;
  }
  if (kw) {
    kw = encodeURI(kw);
    var ress = request('GET', `https://www.ximalaya.com/revision/search?core=album&kw=${kw}&page=1&spellchecker=true&rows=100&condition=relation&device=web`);
    if (ress.getBody()) {
      ret = JSON.parse(ress.getBody()).ret;
      msg = JSON.parse(ress.getBody()).msg;
      if (ret === 200) {
        data = JSON.parse(ress.getBody()).data.result.response.docs;
        console.log("搜索成功");
      } else {
        console.log("搜索失败");
      }
    }
  }
  if (ret !== 200) {
    res.status(ret).send(msg);
  } else if (data.length !== 0) {
    var i = 0;
    var books = [];
    data.forEach((element) => {
      const tags = 'tags' in element ? element.tags.split(',') : [];
      const cover_path = ("http:" + element.cover_path).replace(/!op_type=3&columns=290&rows=290&magick=png/g, "");
      const date = new Date(element.created_at);
      const year = date.getFullYear();
      books[i++] = {
        title: element.title,
        subtitle: element.custom_title,
        author: undefined,
        narrator: element.nickname,
        publisher: "喜马拉雅",
        publishedYear: year,
        description: element.intro,
        cover: cover_path,
        isbn: undefined,
        asin: undefined,
        genres: [element.category_title],
        tags: tags,
        series: undefined,
        language: element.category_title === "外�??" ? "外�??" : "�?�?",
        duration: undefined
      };
    });
    console.log(`搜索结果�?${books.length}�?`);
    console.log(books);
    res.status(200).json({ matches: books });
  } else {
    res.status(200).json({ matches: [] });
  }
});

// 错�??处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${port}`);
});
