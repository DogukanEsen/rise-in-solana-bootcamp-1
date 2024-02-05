const sol = require("@solana/web3.js")
const fs = require("fs")
const readline = require("readline")

let wallet_name = "wallet.json"
let activeWallet = load_wallet(wallet_name)

const connection = new sol.Connection("https://api.devnet.solana.com")
// Cüzdanı .json olarak kayıt işlemleri burada gerçekleştirliyor. 
function save_wallet(WaletDatas){
    let count = 1
    // Burada kayıtlı olmayan bir isim buluyoruz.
    while(fs.existsSync(wallet_name)){
        wallet_name = "wallet" + count.toString() + ".json"
        count++
    }

    fs.writeFileSync(wallet_name,JSON.stringify({
        privateKey: WaletDatas.privateKey.toString(),
        publicKey: WaletDatas.publicKey.toString(),
        balance: WaletDatas.balance
      }, null, 2))
}
// Cüzdan yükleme işlemleri burada gerçekleşiyor. Default olarak wallet.json seçili, kendi cüzdanımızı da seçebiliyoruz.
function load_wallet(filename = "wallet.json"){
     if(fs.existsSync(filename)){
         const wallet_data=JSON.parse(fs.readFileSync(filename,"utf-8"))
         const privateKey = wallet_data.privateKey.split(",")
         console.log("Seçili Hesap: "+ filename + " Seçili public key: " + wallet_data.publicKey)
         return{
            publicKey: new sol.PublicKey(wallet_data.publicKey),
            privateKey: new Uint8Array(privateKey),
            balance: wallet_data.balance
         }
     }else{
        console.log("Hesap Bulunamadi. Önce hesap oluşturun.")
        return null
     }
 }

// Cüzdan oluşturma işlemi buradan gerçekleşiyor. 
function create_Wallet(){
    const wallet = sol.Keypair.generate()
    activeWallet = {
        publicKey: wallet.publicKey,
        privateKey: wallet.secretKey,
        balance: 0
    }
    save_wallet(activeWallet)
    console.log("Cüzdan oluşturuldu: "+ activeWallet.publicKey)
}
// airdrop istekleri buradan gerçekleşiyor. 
async function airdrop_req(number=1){
    if (activeWallet == null){
        console.log("Cüzdan bulunamadı.")
        return
    }
    const signarture=await connection.requestAirdrop(activeWallet.publicKey, number * 10 ** 9)

    activeWallet.balance += number
    console.log(number + " airdrop yapıldı.")

}
// Bakiye chack burada yapılıyor. 
async function Check_Balance(){
    if(activeWallet == null){
        console.log("Cüzdan bulunamadı.")
        return
    }
    const balance = await connection.getBalance(activeWallet.publicKey)
    console.log("Cüzdan bakiyesi:"+ balance / 10 ** 9 +"SOL")
}
// Transfer işlemi burada yapılıyor. Bazen Transaction parametreleri ile ilgili hata alabiliyorum. Çözemedim.
async function Transfer(PublicKey_dest,count){
    if(activeWallet == null){
        console.log("Cüzdan bulunamadı.")
        return
    }

    const transaction = new sol.Transaction().add()(
        sol.SystemProgram.transfer({
            fromPubkey: activeWallet.publicKey,
            toPubkey: new PublicKey(PublicKey_dest),
            lamports: count * 10 ** 9 
        })
    ) 

    const signature = await sendAndConfirmTransaction(connection, transaction, [Keypair.fromSecretKey(activeWallet.privateKey)])
    activeWallet.balance -= count

    console.log(count+" SOL, "+PublicKey+ "adresine transfer edildi. İşlem imzası: "+ signature)

}
// Solana bilgileri burada yazdırılıyor.
async function Solana_Datas(){
    const value = await connection.getBlockHeight()
    console.log("Anlık Blok Yüksekliği: "+value)
}

async function mainMenu() {
    console.log("Ana Menü")
    console.log("new => Yeni Cüzdan Oluştur.")
    console.log("airdrop => Airdrop Yap.")
    console.log("balance => Bakiye Kontrol.")
    console.log("transfer => Transfer işlemleri.")
    console.log("datas => Solana ağı istatistikleri.")
    console.log("load => .json uzantılı hesabı yüklemek için.")
    console.log("Q. Çıkış")
  
    const userInput = await promptUser("Seçiminizi yapın: ")
    userdata = userInput.toLowerCase()
    if(userdata == "new")
        create_Wallet()
    else if(userdata == "airdrop"){
        const airdrop_count = await promptUser("Transfer değeri girin: ")
        airdrop_req(airdrop_count)
    }
    else if (userdata == "balance")
        Check_Balance()
    else if (userdata == "transfer"){
        const publicKey = await promptUser("Public Key girin: ")
        const count = await promptUser("Transfer değeri girin: ")
        Transfer(publicKey,count)
    }
    else if (userdata == "datas")
        Solana_Datas()
    else if (userdata == "load"){
        const filename = await promptUser(".json ile birlikte dosya adını girin: ")
        load_wallet(filename)
    }
    else if(userdata == "q"){
        console.log("Çıkış yapılıyor")
        process.exit(0)
    }
    
    mainMenu()
  }
  
  async function promptUser(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
  
    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close()
        resolve(answer)
      })
    })
  }

mainMenu()