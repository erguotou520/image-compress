import { themes } from '@/constants'
import type { GlobalSettings } from '@/types'
import { SettingOutlined } from '@ant-design/icons'
import { ColorPicker, Form, InputNumber, Modal, Radio, Switch } from 'antd'
import { useState } from 'react'
import useSettings from '../hooks/useSettings'

const Settings = ({ className, icon }: { className?: string, icon?: React.ReactNode }) => {
  const [visible, setVisible] = useState(false)
  const { settings, changeTheme, changePrimaryColor, changeDefaultQuality, changeSvgViewBox } = useSettings()

  return (
    <>
      <div className={`flex items-center cursor-pointer text-main ${className || ''}`} onClick={() => setVisible(true)}>
        {icon || <SettingOutlined />}
        <span className="ml-1">系统设置</span>
      </div>
      <Modal title="系统设置" open={visible} width={400} onCancel={() => setVisible(false)} footer={null}>
        <Form<GlobalSettings>
          layout="horizontal"
          initialValues={settings}
          labelCol={{ span: 8 }}
          // onFinish={(values) => {
          //   changeSettings(values);
          //   setVisible(false);
          // }}
        >
          <Form.Item name="theme" label="主题">
            {/* <Select options={themes as any} /> */}
            <Radio.Group
              onChange={e => {
                changeTheme(e.target.value)
              }}
            >
              {themes.map(theme => (
                <Radio key={theme.value} value={theme.value}>
                  {theme.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item name="primaryColor" label="主题色">
            <ColorPicker
              showText
              onChange={color => {
                changePrimaryColor(color.toHexString())
              }}
            />
          </Form.Item>
          <Form.Item name="defaultQuality" label="默认压缩质量">
            <InputNumber
              min={10}
              max={100}
              suffix="%"
              onChange={value => {
                changeDefaultQuality(value)
              }}
            />
          </Form.Item>
          <Form.Item
            name="removeSVGViewBox"
            label="移除 viewBox"
            tooltip="SVG 的 viewBox 属性是 SVG 图像的坐标系统，移除后可以减少文件大小，但也会导致 SVG 图像无法缩放"
          >
            <Switch
              checked={settings.removeSVGViewBox}
              onChange={value => {
                changeSvgViewBox(value)
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Settings
