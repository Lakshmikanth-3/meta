'use client'

import { useState } from 'react'

interface TaskConfigurationWizardProps {
  onStart: (task: any) => void
}

export default function TaskConfigurationWizard({ onStart }: TaskConfigurationWizardProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [filename, setFilename] = useState('example.py')
  const [code, setCode] = useState('def example():\n    return False')
  const [bugLine, setBugLine] = useState('2')
  const [bugDescription, setBugDescription] = useState('Should return True')

  const handleSubmit = () => {
    const task = {
      task_id: "user-provided-" + Math.floor(Math.random() * 1000),
      pr_title: title || "User Review Task",
      pr_description: description || "Manually provided code for review",
      diffs: [
        {
          filename: filename,
          language: filename.endsWith('.js') ? 'javascript' : 'python',
          lines: code.split('\n'),
          changed_line_numbers: [parseInt(bugLine, 10)]
        }
      ],
      ground_truth_bugs: [
        {
          line: parseInt(bugLine, 10),
          severity: "critical",
          description: bugDescription
        }
      ]
    }
    onStart(task)
  }

  return (
    <div className="rounded border p-6 flex flex-col gap-6" style={{ backgroundColor: '#131618', borderColor: '#1e2227' }}>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium" style={{ color: '#e6edf3' }}>Manual Code Input</h2>
        <p className="text-xs" style={{ color: '#7d8590' }}>Paste the code you want the RL environment to check.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#7d8590' }}>PR Title</label>
          <input 
            value={title} onChange={e => setTitle(e.target.value)}
            className="text-xs rounded px-3 py-1.5 font-mono"
            placeholder="e.g. Fix authentication vulnerability"
            style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#7d8590' }}>Filename</label>
          <input 
            value={filename} onChange={e => setFilename(e.target.value)}
            className="text-xs rounded px-3 py-1.5 font-mono"
            style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d' }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: '#7d8590' }}>PR Description</label>
        <textarea 
          value={description} onChange={e => setDescription(e.target.value)}
          rows={2}
          className="text-xs rounded px-3 py-2 font-mono resize-none"
          placeholder="What is this PR fixing?"
          style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d' }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: '#7d8590' }}>Paste Code (Content of the Diff)</label>
        <textarea 
          value={code} onChange={e => setCode(e.target.value)}
          rows={8}
          className="text-xs rounded px-3 py-2 font-mono resize-none"
          style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d', whiteSpace: 'pre' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#7d8590' }}>Bug Line Number (1-indexed)</label>
          <input 
            type="number" value={bugLine} onChange={e => setBugLine(e.target.value)}
            className="text-xs rounded px-3 py-1.5 font-mono"
            style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#7d8590' }}>Ground Truth Bug Description</label>
          <input 
            value={bugDescription} onChange={e => setBugDescription(e.target.value)}
            className="text-xs rounded px-3 py-1.5 font-mono"
            placeholder="e.g. Hardcoded credentials"
            style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d' }}
          />
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        className="text-sm py-2 rounded font-medium transition-all hover:bg-opacity-90"
        style={{ backgroundColor: '#3fb950', color: '#0d0f11' }}
      >
        Start Manual Review
      </button>
    </div>
  )
}
