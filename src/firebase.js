import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "./config";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ─── Colección de transacciones ───────────────────────────────────────────
const TXN_COL = "txns";

export function subscribeTxns(callback) {
  return onSnapshot(collection(db, TXN_COL), snap => {
    const txns = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    callback(txns);
  });
}

export async function addTxn(txn) {
  await addDoc(collection(db, TXN_COL), {
    ...txn,
    createdAt: serverTimestamp(),
  });
}

export async function removeTxn(id) {
  await deleteDoc(doc(db, TXN_COL, id));
}
