import React from 'react'
import PromptSuggestionButton from './PromptSuggestionButton'

const PrompSuggestionsRow = ({onPromptClick}: any) => {
    const prompts = [
        "What is the latest news in Formula One?",
        "Who is the best driver in Formula One?",
        "Who is the best team in Formula One?",
        "Who is the current Formula One World Champion?",
    ]
  return (
    <div className='prompt-suggestion-row'>
        {prompts.map((prompt, index) => (
            <PromptSuggestionButton 
            key={`suggestion-${index}`} 
            text={prompt} 
            onClick={() => onPromptClick(prompt)}
            />
        ))}
    </div>
  )
}
export default PrompSuggestionsRow