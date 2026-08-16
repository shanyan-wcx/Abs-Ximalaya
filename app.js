const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 7814;

// 移除购买须知及其后的所有内容
function removePurchaseNotes(htmlContent) {
    const $ = cheerio.load(htmlContent);

    let found = false;
    $('p').each(function() {
        const $p = $(this);
        if (!found && /购买须知/.test($p.text())) {
            found = true;
        }
        if (found) {
            $p.remove();
        }
    });

    return $.html();
}

// 移除结尾多余的 <br> 标签
function removeTrailingBr(html) {
  const $ = cheerio.load(html);

  // 删除 body 末尾所有连续的 <br> 标签（无论是否被包裹）
  $('body').find('br').each((_, el) => {
    // 如果这个 <br> 之后没有非空内容，就删掉
    const next = $(el).nextAll().text().trim();
    if (!next && $(el).parent().nextAll().text().trim() === '') {
      $(el).remove();
    }
  });

  // 清空仅包含 <br> 的标签（例如 <span><br><br></span>）
  $('body').find('*').each((_, el) => {
    const html = $(el).html()?.trim();
    if (html && /^(\s*<br\s*\/?>\s*)+$/.test(html)) {
      $(el).empty();
    }
  });

  return $.html();
}

// 使用 JSON 解析中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ encoding: 'utf-8' }));

// 设置ICON
app.use('/favicon.ico', express.static('assets/favicon.ico'));

// 首页
app.get('/', (req, res) => {
  res.status(200).send("欢迎使用Abs-Ximalaya！<br>这是一个Audiobookshelf的喜马拉雅元数据提供程序。");
});

// === 用于获取详细介绍的请求头（网页版 revision API，无需 Cookie）===
const detailApiHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
};

// 搜索书籍 - 使用 async/await 进行异步处理
app.get('/search', async (req, res, next) => {
  try {
    const { query, author } = req.query;
    let kw = query || author;

    console.log(`开始搜索 - 标题：${query}；作者：${author}`);

    if (!kw) {
      console.log("搜索关键词为空");
      return res.status(200).json({ matches: [] });
    }

    // 1. 发起初始搜索请求
    const searchUrl = `https://www.ximalaya.com/revision/search?core=album&kw=${encodeURI(kw)}&page=1&spellchecker=true&rows=20&condition=relation&device=web`; // 减少行数以提高性能，例如20
    const searchResponse = await axios.get(searchUrl);

    if (searchResponse.data.ret !== 200) {
      console.log("搜索API失败:", searchResponse.data.msg);
      return res.status(searchResponse.data.ret).send(searchResponse.data.msg);
    }

    const searchResults = searchResponse.data.data.result.response.docs;

    if (!searchResults || searchResults.length === 0) {
      console.log("什么也没找到~");
      return res.status(200).json({ matches: [] });
    }
    console.log(`初步搜索成功，找到 ${searchResults.length} 条结果。`);

    // 2. 并行获取每个结果的详细介绍
    const bookPromises = searchResults.map(async (element) => {
      let richDescription = element.intro; // 默认使用旧的简介

      try {
        const detailUrl = 'https://www.ximalaya.com/revision/album';
        const detailResponse = await axios.get(detailUrl, {
          params: {
            albumId: element.id, // 使用搜索结果的 id
          },
          headers: detailApiHeaders
        });

        // 网页版详情接口：detailRichIntro 是完整版介绍，richIntro 会被截断
        const richIntroHtml = detailResponse.data?.data?.mainInfo?.detailRichIntro;
        if (richIntroHtml) {
          richDescription = removePurchaseNotes(richIntroHtml);
          richDescription = removeTrailingBr(richDescription);
          console.log(`成功获取 Album ID: ${element.id} 的详细介绍`);
        }
      } catch (error) {
        console.error(`获取 Album ID: ${element.id} 的详细介绍失败:`, error.message);
        // 如果获取失败，我们已经设置了默认的 element.intro，所以不需要额外操作
      }

      // 3. 构建最终的书籍信息对象
      const tags = 'tags' in element ? element.tags.split(',') : [];
      const cover_path = ("http:" + element.cover_path).replace(/!op_type=3&columns=290&rows=290&magick=png/g, "");
      const date = new Date(element.created_at);
      const year = date.getFullYear();
      let author_ = author;
      if (!((element.intro && element.intro.includes(author)) || (element.custom_title && element.custom_title.includes(author)) || (element.title && element.title.includes(author)))) {
        author_ = undefined; // 如果作者不匹配，则不设置
      }

      return {
        title: element.title,
        subtitle: element.custom_title,
        author: author_,
        narrator: element.nickname,
        publisher: "喜马拉雅",
        publishedYear: year,
        description: richDescription, // 使用获取到的新简介
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

    // 等待所有详细信息的请求完成
    const books = await Promise.all(bookPromises);

    console.log(`搜索完成：共返回 ${books.length} 条处理后的结果`);
    res.status(200).json({ matches: books });

  } catch (error) {
    // 捕获所有异步过程中的错误
    next(error);
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
