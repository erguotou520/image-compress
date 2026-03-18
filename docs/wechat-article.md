# image-compress 升级为 media-compress，现在支持视频压缩了

### 从图片到视频

做 image-compress 这个项目的初衷很简单——我需要一个好用的图片压缩工具。那时候刚做完个人网站的图片优化，试了好几个工具都不太满意，要么功能太复杂，要么压缩效果不理想，于是就自己写了一个。

项目上线后收到了不少用户的反馈，其中有一个需求反复出现："能不能支持视频压缩？"

我一开始是犹豫的。视频压缩比图片复杂得多，编码格式、码率控制、兼容性问题，这些都是需要考虑的。而且加上视频功能后，安装包体积会明显变大——对于只需要压缩图片的用户来说，这算是一种负担。

但想了想，视频文件确实是现在存储空间的大头。手机随便拍几段 4K 视频，几个 GB 就没了。如果能做好视频压缩，对用户的帮助会更大。

于是花了两个月时间，在 0.2.0 版本加入了视频压缩功能。项目也不再只是图片工具，所以改名叫 media-compress。

### 界面预览

<table style="width:100%">
<tr>
<th style="text-align:center">视频压缩设置</th>
</tr>
<tr>
<td style="text-align:center"><img src="https://raw.githubusercontent.com/erguotou520/media-compress/refs/heads/electron/assets/media-settings.png" /></td>
</tr>
<tr>
<th style="text-align:center">视频压缩</th>
</tr>
<tr>
<td style="text-align:center"><img src="https://raw.githubusercontent.com/erguotou520/media-compress/refs/heads/electron/assets/media-compress.png" /></td>
</tr>
</table>

### 关于体积的变化

这里要坦诚地说明：新版本比之前的 image-compress 大了不少。

原因是集成了 FFmpeg 和 FFprobe 用于视频处理。这是没办法的事，FFmpeg 本身就比较大。如果你只需要压缩图片，完全可以继续使用旧版本的 image-compress，GitHub Releases 里还能下载到。

对我来说，维护两个版本成本有点高，所以后续主要会维护 media-compress。图片压缩的功能完全保留，只是增加了视频能力，你可以按需选择。

### 视频压缩的实现细节

技术实现上用的是 FFmpeg，这几乎是视频处理的标准选择了。支持三种编码器：

- H.264：兼容性最好，几乎所有设备都能播放
- H.265/HEVC：相同画质下体积比 H.264 小 50% 左右
- VP9：开源格式，网页播放性能不错

压缩模式用的是 CRF（Constant Rate Factor），恒定质量模式。简单说就是根据画面复杂度动态分配码率，复杂场景多给点，简单场景省点空间。这样整个视频的视觉质量比较一致，不会出现某些场景特别糊的情况。

支持的格式有 MP4、MKV、MOV、AVI、WMV、FLV、WebM。基本上日常能遇到的格式都覆盖了。

### 使用方式

没什么复杂的，拖文件进去，选择编码器和压缩强度，点开始就行。所有处理都在本地完成，不会上传到任何服务器。

### 后续

如果你有其他需求或建议，欢迎在 GitHub 上提 issue。

### 下载

GitHub Releases 页面有各个平台的安装包。macOS 用户首次打开如果遇到安全限制，执行这个命令就行：

```bash
sudo xattr -dr com.apple.quarantine /Applications/media-compress.app
```

还是那句话，如果你只需要压缩图片，image-compress 的旧版本依然可用。

项目地址：https://github.com/erguotou520/media-compress
