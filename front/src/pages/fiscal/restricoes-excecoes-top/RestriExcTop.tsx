import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import useRestExcTop from "./hooks/useRestExcTop";
import { type TipoRestricao, type TOP, type TipMov } from "./types";

export default function RestriExcTop() {
    const [tipMov, setTipMov] = useState<TipMov[]>([])
    const [tipoRestricao, setTipoRestricao] = useState<TipoRestricao[]>([])
    const [tops, setTops] = useState<TOP[]>([])
    const [loading, setLoading] = useState<boolean>(false);
    const  { fetchTipMov, fetchTipoRestricao, fetchRestricaoTop, fetchTops }  = useRestExcTop()

    useEffect(() => {
        let active = true;

        async function load() {
            try {
            setLoading(true);

            const [tops, tipMov, tipoRestricao] = await Promise.all([
                fetchTops(),
                fetchTipMov(),
                fetchTipoRestricao(),
            ]);

            if (!active) return;

            setTops(tops);
            setTipMov(tipMov);
            setTipoRestricao(tipoRestricao);
            } catch (err) {
            console.error("Erro ao carregar dados iniciais", err);
            } finally {
            if (active) setLoading(false);
            }
        }

        load();

        return () => {
            active = false;
        };
        }, [fetchTops, fetchTipMov, fetchTipoRestricao]);

        
    return (
        <Layout title="Restrições/Exceções da TOP">
            <p>a</p>
        </Layout>
    )
}