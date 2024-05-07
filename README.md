# Abs-Ximalaya

Audiobookshelf的喜马拉雅元数据提供程序。

## 使用方法

```bash
docker pull shanyanwcx/abs-ximalaya:latest
```

启动容器后在Audiobookshelf->设置->项目元数据管理->自定义元数据提供者中点击增加，输入名称和`http://IP:PORT`，再点击增加即可。

容器默认端口为`7814`，注意URL最后不能带`/`。

![屏幕截图 2024-05-07 234206](https://github.com/shanyan-wcx/Abs-Ximalaya/assets/58252651/46f7e2a0-979b-4efd-adf5-3c3efcad4ca1)
