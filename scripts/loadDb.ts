import { DataAPIClient} from '@datastax/astra-db-ts';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
// import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import Groq from "groq-sdk"


import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import dotenv from "dotenv"
dotenv.config()




type SimilarityMetric = "dot_product" | "cosine" | "euclidean"



const { 
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION_NAME, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    GROQ_API_KEY, 
    HUGGINGFACE_API_KEY,
    VECTOR_MODEL,
    VECTOR_DIMENSION
     } = process.env

//  Get the embeddings: Hugging face embeddings Inference:
const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: HUGGINGFACE_API_KEY,
    model: "intfloat/multilingual-e5-large",
  },
);

//  Connect to groq:
const groq = new Groq({apiKey: GROQ_API_KEY})

const f1Data = [
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://www.skysports.com/f1/news/12433/13253169/f1-2025-launch-event-at-the-o2-featuring-drivers-teams-and-new-liveries-confirmed-in-formula-1-first',
    'https://www.formula1.com/en/latest/all',
    'https://www.forbes.com/sites/bradadgate/2024/03/11/heres-why-formula-1-racing-is-growing-in-popularity-with-women/',
    'https://www.autosport.com/f1/news/why-f1s-2025-livery-launch-event-will-be-an-important-litmus-test/10672366/',
    "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
    "https://en.wikipedia.org/wiki/List_of_Formula_One_driver_records"
]

// Initialize the client and get a 'Db' object
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, {namespace: ASTRA_DB_NAMESPACE});
console.log(`*Connected to AstraDB DB ${db.id}`);



//  Define a splitter:
const splitter = new RecursiveCharacterTextSplitter({
    chunkOverlap: 108, // overlapping characters between chunks
    chunkSize: 512 
})

// Create a Collection integrated with Huggin Face Severless Embeddings:
const createCollection = async (similarityMetric: SimilarityMetric="dot_product") => {
    try{
        //  Create a collection, or gets it if it already exists
    const res = await db.createCollection(ASTRA_DB_COLLECTION_NAME!, {
        namespace: ASTRA_DB_NAMESPACE,
        vector: {
            service: {
                provider: 'huggingface',
                modelName: VECTOR_MODEL,
                authentication: {
                    providerKey: HUGGINGFACE_API_KEY
                },
            },
            dimension:1024,
            metric:  similarityMetric,
        },
        checkExists: false,
    });
    console.log(`* Created collection ${res.keyspace}. ${res.collectionName}`);
} catch (e){
    console.error(e)
    console.log(`* Couldn't create collection or collection ${ASTRA_DB_COLLECTION_NAME} already exists`)
}
}

// Create vector embeddings:
const loadSampleData = async() =>{
    const collection =  db.collection(ASTRA_DB_COLLECTION_NAME!)
    for await (const url of f1Data){
        const content = await scrapePage(url)
        const chunks = await splitter.splitText(content)
        for await (const chunk of chunks){
            const embedding = await  new HuggingFaceInferenceEmbeddings({
                apiKey: HUGGINGFACE_API_KEY,
                model: "intfloat/multilingual-e5-large",})._embed([chunk])
            const vector = embedding[0]

            const res = await collection.insertOne({
                $vector: vector,
                text: chunk,
            })
            console.log(res)
        }
    }
}
const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true,
        },
        gotoOptions: {
            waitUntil: "domcontentloaded",
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerText)
            await browser.close()
            return result
        }
    })
    return ( await loader.scrape())?.replace(/<[^>]*>?/gm, '') 
}

createCollection().then(() => loadSampleData())
