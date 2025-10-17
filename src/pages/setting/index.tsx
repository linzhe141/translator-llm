import { useAgent } from '@/hooks/useAgent'
import { useSettingsStore } from '@/store/settings'
import { Loader, MoveLeft, Zap } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router'
import { toast } from 'sonner'
import { generateText } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

interface FormData {
  apiKey: string
  baseUrl: string
  reasonModelID: string
  toolModelID: string
}
export default function Setting() {
  const { createAgent } = useAgent()
  const [reasonModelConnecting, setReasonModelConnecting] = useState(false)
  const [toolModelConnecting, setToolModelConnecting] = useState(false)
  const [error, setError] = useState(false)
  const [formErrors, setFormErrors] = useState<FormData>({
    apiKey: '',
    baseUrl: '',
    reasonModelID: '',
    toolModelID: '',
  })

  const { apiKey, baseUrl, reasonModelID, toolModelID, setLLMApi } =
    useSettingsStore()
  const [formData, setFormData] = useState({
    apiKey: apiKey || '',
    baseUrl: baseUrl || '',
    reasonModelID: reasonModelID || '',
    toolModelID: toolModelID || '',
  })

  const validateForm = () => {
    const errors = {
      apiKey: '',
      baseUrl: '',
      reasonModelID: '',
      toolModelID: '',
    }

    if (!formData.apiKey.trim()) {
      errors.apiKey = 'API Key is required'
    }

    if (!formData.baseUrl.trim()) {
      errors.baseUrl = 'Base URL is required'
    }

    if (!formData.reasonModelID.trim()) {
      errors.reasonModelID = 'reasonModelID is required'
    }

    if (!formData.toolModelID.trim()) {
      errors.toolModelID = 'toolModelID is required'
    }

    setFormErrors(errors)
    return Object.values(errors).filter(Boolean).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    console.log('Form submitted:', formData)
    setError(false)

    try {
      setLLMApi(formData)
      createAgent()
      toast.success('LLM client settings updated successfully!')
    } catch (e) {
      console.error('Error setting LLM client:', e)
      setError(true)
    }
  }
  const handleConnect = async (type: 'reasoning' | 'tool') => {
    if (!validateForm()) {
      return
    }
    const setConnectState =
      type === 'reasoning' ? setReasonModelConnecting : setToolModelConnecting
    const model =
      type === 'reasoning' ? formData.reasonModelID : formData.toolModelID
    const label = type === 'reasoning' ? 'Reasoning Model' : 'Tool Model'
    setError(false)
    setConnectState(true)

    try {
      const openai = createOpenAICompatible({
        name: 'openai-compatible',
        apiKey: formData.apiKey,
        baseURL: formData.baseUrl,
      })
      await generateText({
        model: openai(model),
        prompt: 'hello, just test connection, only output 10 character',
      })
      toast.success(
        <span>
          <span>
            {label}: {model}
          </span>
          <span> connection test successful!</span>
        </span>
      )
    } catch (e: any) {
      console.error('Error', e)
      setError(true)
      if (e.statusCode === 404) {
        toast.error(
          <div className='text-red-500'>
            Connection test failure: 当前 API 不支持所选模型
          </div>
        )
      }
    } finally {
      setConnectState(false)
    }
  }

  return (
    <div className='mx-auto mt-10 max-w-[800px]'>
      <div className='mb-8 flex justify-between'>
        <div className='flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5'>
          <Zap className='h-4 w-4 text-blue-500' />
          <span className='text-sm font-medium text-blue-600'>
            LLM settings
          </span>
        </div>

        <NavLink
          to='/'
          className='flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 hover:bg-blue-200'
        >
          <MoveLeft className='h-4 w-4 text-blue-500' />
          <span className='text-sm font-medium text-blue-600'>home</span>
        </NavLink>
      </div>

      {error && <div className='mb-4 text-red-400'>Something went wrong</div>}

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='space-y-2'>
          <label
            htmlFor='apiKey'
            className='text-secondary-foreground block text-lg'
          >
            API Key
          </label>
          <input
            id='apiKey'
            type='text'
            value={formData.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
            placeholder='Enter your API key'
          />
          {formErrors.apiKey && (
            <p className='text-sm text-red-500'>{formErrors.apiKey}</p>
          )}
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='baseUrl'
            className='text-secondary-foreground block text-lg'
          >
            Base URL
          </label>
          <input
            id='baseUrl'
            type='text'
            value={formData.baseUrl}
            onChange={(e) => handleInputChange('baseUrl', e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
            placeholder='https://api.example.com'
          />
          {formErrors.baseUrl && (
            <p className='text-sm text-red-500'>{formErrors.baseUrl}</p>
          )}
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='reasonModelID'
            className='text-secondary-foreground flex items-center justify-between text-lg'
          >
            Reasoning Model
            <button
              type='button'
              onClick={() => handleConnect('reasoning')}
              disabled={reasonModelConnecting}
              className='ml-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            >
              {reasonModelConnecting ? (
                <Loader className='h-4 w-4 animate-spin' />
              ) : (
                <Zap className='h-4 w-4' />
              )}
              <span className='ml-2'>
                {reasonModelConnecting ? 'Connecting...' : 'Connect test'}
              </span>
            </button>
          </label>
          <input
            id='reasonModelID'
            type='text'
            value={formData.reasonModelID}
            onChange={(e) => handleInputChange('reasonModelID', e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
            placeholder='gpt-3.5-turbo'
          />
          {formErrors.reasonModelID && (
            <p className='text-sm text-red-500'>{formErrors.reasonModelID}</p>
          )}
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='toolModelID'
            className='text-secondary-foreground flex items-center justify-between text-lg'
          >
            Tool Model
            <button
              type='button'
              onClick={() => handleConnect('tool')}
              disabled={toolModelConnecting}
              className='ml-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            >
              {toolModelConnecting ? (
                <Loader className='h-4 w-4 animate-spin' />
              ) : (
                <Zap className='h-4 w-4' />
              )}
              <span className='ml-2'>
                {toolModelConnecting ? 'Connecting...' : 'Connect test'}
              </span>
            </button>
          </label>
          <input
            id='toolModelID'
            type='text'
            value={formData.toolModelID}
            onChange={(e) => handleInputChange('toolModelID', e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
            placeholder='gpt-3.5-turbo'
          />
          {formErrors.toolModelID && (
            <p className='text-sm text-red-500'>{formErrors.toolModelID}</p>
          )}
        </div>

        <div className='flex items-center gap-4'>
          <button
            type='submit'
            className='inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
          >
            <span className='ml-2'>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  )
}
