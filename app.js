const express = require('express');
const request = require('sync-request');

const app = express();
const port = 7814;

// 使用 JSON 解析中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ encoding: 'utf-8' }));

// 设置ICON
app.use('/favicon.ico', express.static('assets/favicon.ico'));

// 首页
app.get('/', (req, res) => {
  res.status(200).send("欢迎使用Abs-Ximalaya！<br>这是一个Audiobookshelf的喜马拉雅元数据提供程序。");
});

// 搜索书籍
app.get('/search', (req, res) => {
  const { query, author } = req.query;
  var kw;
  var data = [];
  var ret = 200;
  var msg;
  console.log(`开始搜索 - 标题：${query}；作者：${author}`);
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
      var author_;
      if ((element.intro && element.intro.includes(author)) || (element.custom_title && element.custom_title.includes(author)) || (element.title && element.title.includes(author))) {
        author_ = author;
      }
      books[i++] = {
        title: element.title,
        subtitle: element.custom_title,
        author: author_,
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
        language: element.category_title === "外语" ? "外语" : "中文",
        duration: undefined
      };
    });
    console.log(`搜索结果：共 ${books.length} 条`);
    console.log(books);
    res.status(200).json({ matches: books });
  } else {
    console.log("什么也没找到~");
    res.status(200).json({ matches: [] });
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error - 发生了一些错误！');
});

// 未定义路由处理
app.use((req, res, next) => {
  res.status(404).send("404 - 页面不存在。");
});

app.listen(port, '::', () => {
  console.log(`Server is running at http://localhost:${port}`);
});
