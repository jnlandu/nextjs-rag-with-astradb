import { groq } from '@ai-sdk/groq';
import Groq  from 'groq-sdk';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { DataAPIClient } from '@datastax/astra-db-ts';
import { streamText } from 'ai';
import { StreamTextResult } from 'ai';


const { 
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION_NAME, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    GROQ_API_KEY, 
    HUGGINGFACE_API_KEY,
     } = process.env


    //  const groqClient =  groq()
const groqClient = new Groq({apiKey: GROQ_API_KEY})
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, {namespace: ASTRA_DB_NAMESPACE});


export async function POST(req: Request){
    try{
        const { messages } = await req.json()
        // const latestMessage = messages[messages?.length - 1]
        const latestMessage = messages[messages?.length - 1]?.content
        let docContext = ''
        // Create an embedding for the latest message:
      
        const embedding = await  new HuggingFaceInferenceEmbeddings({
            apiKey: HUGGINGFACE_API_KEY,
            model: "intfloat/multilingual-e5-large",
        })._embed([latestMessage]) // Embed the latest message
        // Get the embeddings from the database:
        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION_NAME!)
            const cursor =  collection.find({}, {
                sort: { 
                    $vector: embedding[0]
                },
                limit: 10
            })
            const documents  = await cursor.toArray()
            console.log('Debugging the documents:', documents)
            const docsMap = documents?.map((doc) => doc.text)
            // documents?.forEach((doc) => {
            //     console.log('Debugging the doc:', doc)
            //     console.log('--------------------------')
            //     console.log('Debugging the doc text:', doc.text)
            // })
            console.log('Debugging the docsMap:', docsMap)
            console.log('--------------------------')
            docContext = JSON.stringify(docsMap)
            console.log('Debugging the docContext:', docContext)
            
        } catch(e){
                console.log('Error querrying the database:', e)
                docContext = ''
        }

        const template = {
            role: 'system',
            content: ` You are an AI assistant who knows everything about Forumla One. Use the below context to augment what you know
            about Forumula One racing.
            The context will provide you with the most recent page data from wikipedia,
            the official Formula One website, and other sources.
            If the context doesn't include the information you need to answer based on your existing
            knowledge and don't mention the source of your information or what the context does or doesn't include.
            Format your responses using markdown where applicable and don't return images.
            ----------------------
            START CONTEXT
            ${docContext}
            END CONTEXT
            ---------------------- 
            QUESTION: ${latestMessage}
            -----------------------
            `
        } 

    //    const chatCompletion = await groqClient.chat.completions.create({
    //     messages: [template, ...messages],
    //     model: 'mixtral-8x7b-32768',
    //     max_tokens: 1024,
    //     stream: true,
    //    }) 
    //    const allContent = []
    //    for await (const chunk of chatCompletion){
    //     allContent.push(chunk.choices[0].delta?.content)
    //     console.log(chunk.choices[0].delta?.content || 'error, not streaming')
    //    };
    //    const res =  new Response(JSON.stringify(allContent), {status: 200})
    //    console.log('Debugging the response:', res)
    //    return res
       const result = streamText({
        model: groq('mixtral-8x7b-32768'),
        messages: [template, ...messages],
       })
    //    console.log('Debugging the result:', result)
       console.log('-----------------')
    //    console.log('Debugging the resultat:', result.toDataStreamResponse())
       return result.toDataStreamResponse()
    } catch(e){
        throw e
    }
}




