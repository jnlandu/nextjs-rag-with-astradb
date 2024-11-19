import React from 'react'
import { Message } from 'ai'
  
const Bubble = ({message}: any) => {
  const {content, role} = message
  return (
    <div className={`${role} bubble`}>
        <p>{content}</p>
    </div>
  )
}

export default Bubble