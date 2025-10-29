// importa desde el mismo directorio src/
import {
  bootstrapState, createAutoCloudSaver,
  cloudSave, cloudLoad,
  copyShareLink, downloadCurrentHTML, downloadZIP,
  format, runAdminSelfTests, DEFAULT_DOC_ID
} from "./admin.js";

// Ejemplo (React):
// const [docId, setDocId] = useState(DEFAULT_DOC_ID);
// const [procesos, setProcesos] = useState([]);
// const autoRef = useRef(null);

useEffect(() => {
  (async () => {
    const fallback = procesos?.length ? procesos : []; // si ya tienes un estado inicial
    const { docId, procesos: initial } = await bootstrapState({ fallback });
    setDocId(docId);
    setProcesos(initial);
    autoRef.current = createAutoCloudSaver(docId, 1200);
    runAdminSelfTests(); // opcional
  })();
}, []);

useEffect(() => { autoRef.current?.(procesos); }, [procesos]);

// Conecta tus botones:
// onClick={async ()=> await cloudSave(docId, procesos)}
// onClick={async ()=> { const r = await cloudLoad(docId); if(r) setProcesos(r); }}
// onClick={async ()=> { const url = await copyShareLink(docId); /* muestra "Copiado" */ }}
// onClick={downloadCurrentHTML}
// onClick={async ()=> await downloadZIP()}

// En tu toolbar:
// setValue(format.wrapBold(value, s, e))
// setValue(format.toBullets(value))
// setValue(format.toNumbers(value))
