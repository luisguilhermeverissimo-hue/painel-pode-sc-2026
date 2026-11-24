#!/usr/bin/perl
# Painel da chapa estadual do PODE/SC – extração dos dados automáticos.
# Gera dados/dados_auto.js (const A = {...}) a partir das cópias de trabalho e das planilhas da pasta 07.
#
# uso (a partir da subpasta "PAINEL - PODE SC"):
#   perl -CSD _scripts/02_painel_dados.pl
#
# Entradas:
#   C:/relest/p07/secao/metricas2.tsv        métricas das 39 candidaturas na urna (Frente 1)
#   C:/relest/p07/secao/pode_est_secao.tsv   votos por seção das candidaturas do PODE (votacao_secao_2026_SC, 26/10/2026)
#   C:/relest/p07/painel/pode_cand.tsv       consulta_cand_2026 (25/10/2026), PODE/SC
#   C:/relest/p07/painel/fotos/              fotos de urna (foto_cand2026_SC_div.zip, TSE)
#   C:/relest/p07/painel/sc_mun.json         malha municipal de SC (IBGE, API de malhas v3, qualidade mínima)
#   C:/relest/p07/painel/sc_mun_nomes.json   nomes dos municípios (IBGE, API de localidades)
#   ../Instagram_Publicacoes_*_coleta_2026-11-24.csv  (pasta 07)
use strict; use warnings; use utf8; use MIME::Base64; use Unicode::Normalize;

my $W = 'C:/relest/p07';
my %A;

sub rd { my ($f) = @_; open my $h, '<:encoding(UTF-8)', $f or die "$f: $!"; local $/; my $t = <$h>; close $h; $t =~ s/^\x{FEFF}//; $t }
sub js { # serializador JSON simples (hash, array, número, string)
    my ($v) = @_;
    if (ref $v eq 'HASH')  { return '{' . join(',', map { js_s($_) . ':' . js($v->{$_}) } sort keys %$v) . '}' }
    if (ref $v eq 'ARRAY') { return '[' . join(',', map { js($_) } @$v) . ']' }
    return 'null' unless defined $v;
    return $v if $v =~ /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/ && $v !~ /^0\d/;
    return js_s($v);
}
sub js_s { my $s = shift; $s =~ s/\\/\\\\/g; $s =~ s/"/\\"/g; $s =~ s/\r?\n/\\n/g; $s =~ s/\t/ /g; $s =~ s/</\\u003c/g; "\"$s\"" }
sub chave { my $s = NFD(uc shift); $s =~ s/\pM//g; $s =~ s/[^A-Z0-9]//g; $s }

# ---------- candidaturas (consulta_cand) ----------
my (%cand, %porNr);
for (split /\n/, rd("$W/painel/pode_cand.tsv")) {
    s/\r//; my @c = split /\t/;
    my %r; @r{qw(cargo sq nr nome urna genero nasc cor civil instrucao ocupacao resultado situacao)} = @c;
    $r{cargo} = $r{cargo} == 7 ? 'DE' : 'DF';
    $cand{$r{sq}} = \%r; $porNr{$r{nr}} = \%r;
}
die "candidaturas: esperado 57\n" unless keys %cand == 57;

# ---------- métricas (Frente 1) ----------
my @met; my @h;
for (split /\n/, rd("$W/secao/metricas2.tsv")) {
    s/\r//; my @c = split /\t/;
    if (!@h) { @h = @c; next }
    my %r; @r{@h} = @c;
    push @met, {
        sexo => $r{sexo}, nr => $r{nr}, urna => $r{urna}, votos => $r{votos}, secoes => $r{secoes},
        secoes1 => $r{secoes_1voto}, p1 => $r{'%1voto'}, maxSecao => $r{max_secao}, locais => $r{locais},
        maxLocal => $r{max_local}, municipios => $r{municipios}, zonas => $r{zonas}, topMun => $r{top_mun},
        votosTop => $r{votos_top}, pTop => $r{'%top'}, receita => $r{receita}, fefc => $r{fefc}, rpv => $r{'R$/voto'},
        sq => ($porNr{$r{nr}} // {})->{sq},
    };
}
die "métricas: esperado 39 candidaturas na urna\n" unless @met == 39;
my $nF = grep { $_->{sexo} eq 'F' } @met;
die "métricas: esperado 13 mulheres\n" unless $nF == 13;
$A{metricas} = \@met;

# ---------- votos por município e por local ----------
my (%vm, %vl, %own, %munNome, %tot);
my %propria = (20444 => [100, 245], 20522 => [100, 68], 20026 => [100, 313], 20999 => [100, 82]);
my %localProprio;
open my $sh, '<:encoding(UTF-8)', "$W/secao/pode_est_secao.tsv" or die $!;
my @linhas;
while (<$sh>) {
    s/\r?\n//; my ($cm, $mn, $z, $s, $nr, $nome, $v, $lc, $ln) = split /\t/;
    next unless $nr =~ /^20\d{3}$/;
    $vm{$nr}{$mn} += $v; $vl{$nr}{"$mn|$z|$lc|$ln"} += $v; $tot{$nr} += $v; $munNome{chave($mn)} = $mn;
    if (my $p = $propria{$nr}) { $localProprio{$nr} = "$mn|$z|$lc|$ln" if $mn eq 'FLORIANÓPOLIS' && $z == $p->[0] && $s == $p->[1]; }
    push @linhas, [$mn, $z, $s, $nr, $v, "$mn|$z|$lc|$ln"];
}
close $sh;
for my $nr (keys %propria) {
    my ($z, $s) = @{$propria{$nr}};
    my ($naSecao, $noLocal) = (0, 0);
    for my $l (@linhas) {
        next unless $l->[3] == $nr && $l->[0] eq 'FLORIANÓPOLIS';
        $naSecao += $l->[4] if $l->[1] == $z && $l->[2] == $s;
        $noLocal += $l->[4] if defined $localProprio{$nr} && $l->[5] eq $localProprio{$nr};
    }
    $own{$nr} = { zona => $z, secao => $s, naSecao => $naSecao, noLocal => $noLocal, local => (split /\|/, ($localProprio{$nr} // '|||'))[3] // '' };
}
die "voto na própria seção diverge da Frente 1\n" unless $own{20444}{naSecao} == 1 && $own{20522}{naSecao} == 1 && $own{20026}{naSecao} == 1 && $own{20999}{naSecao} == 4 && $own{20999}{noLocal} == 20 && $own{20522}{noLocal} == 1;
for my $m (@met) { die "votos de $m->{nr} divergem\n" unless ($tot{$m->{nr}} // 0) == $m->{votos} }
my (%VM, %VL);
for my $nr (keys %vm) {
    $VM{$nr} = { map { chave($_) => $vm{$nr}{$_} } keys %{$vm{$nr}} };
    my @l = sort { $vl{$nr}{$b} <=> $vl{$nr}{$a} } keys %{$vl{$nr}};
    $VL{$nr} = [ map { my @p = split /\|/; { mun => $p[0], zona => $p[1], local => $p[3], votos => $vl{$nr}{$_} } } @l[0 .. ($#l < 7 ? $#l : 7)] ];
}
$A{votosMun} = \%VM; $A{topLocais} = \%VL; $A{votoProprio} = \%own;

# ---------- malha do IBGE projetada em SVG ----------
my $nomes = rd("$W/painel/sc_mun_nomes.json");
my %ibgeNome; while ($nomes =~ /\{"id":(\d{7}),"nome":"([^"]+)"/g) { $ibgeNome{$1} = $2 }
my $g = rd("$W/painel/sc_mun.json");
my @feat;
while ($g =~ /"geometry":\s*\{"type":\s*"(\w+)",\s*"coordinates":\s*(\[.*?\]\]\]?\]?)\},\s*"properties":\s*\{"codarea":\s*"(\d+)"\}/gs) { push @feat, [$1, $2, $3] }
die "malha: esperado 295 municípios, obtido " . scalar(@feat) . "\n" unless @feat == 295;
my ($x0, $x1, $y0, $y1) = (999, -999, 999, -999);
for my $f (@feat) { while ($f->[1] =~ /\[(-?[\d.]+),\s*(-?[\d.]+)\]/g) { $x0 = $1 if $1 < $x0; $x1 = $1 if $1 > $x1; $y0 = $2 if $2 < $y0; $y1 = $2 if $2 > $y1 } }
my $k = cos(((($y0 + $y1) / 2) * 3.14159265) / 180);
my $Wd = 1000; my $esc = $Wd / (($x1 - $x0) * $k); my $Ht = sprintf '%.0f', ($y1 - $y0) * $esc;
my (@mapa, %semVoto);
for my $f (@feat) {
    my $d = '';
    for my $anel ($f->[1] =~ /\[(\[\s*-?[\d.]+,\s*-?[\d.]+\](?:,\s*\[\s*-?[\d.]+,\s*-?[\d.]+\])*)\]/g) {
        my @p; while ($anel =~ /\[(-?[\d.]+),\s*(-?[\d.]+)\]/g) { push @p, sprintf('%.1f,%.1f', ($1 - $x0) * $k * $esc, ($y1 - $2) * $esc) }
        $d .= 'M' . join('L', @p) . 'Z';
    }
    my $nome = $ibgeNome{$f->[2]} // die "sem nome IBGE para $f->[2]\n";
    my $ck = chave($nome);
    push @mapa, { c => $ck, n => $nome, d => $d };
}
my %malhaChaves = map { $_->{c} => 1 } @mapa;
my @faltam = grep { !$malhaChaves{$_} } keys %munNome;
# grafias divergentes entre TSE e IBGE
my %alias = ('BALNEARIOPICARRAS' => 'BALNEARIOPICARRAS', 'GRAOPARA' => 'GRAOPARA', 'HERVALDOESTE' => 'HERVALDOESTE', 'SAOCRISTOVAODOSUL' => 'SAOCRISTOVAODOSUL', 'LAJEADOGRANDE' => 'LAJEADOGRANDE', 'PRESIDENTECASTELLOBRANCO' => 'PRESIDENTECASTELOBRANCO', 'SAOLOURENCODOOESTE' => 'SAOLOURENCODOOESTE');
my %fix;
for my $f (@faltam) {
    # tenta casar por proximidade simples (mesmas letras sem uma)
    my ($melhor) = grep { my $m = $_; (length($m) - length($f))**2 <= 4 && (index($m, substr($f, 0, 6)) == 0) } keys %malhaChaves;
    $fix{$f} = $melhor if $melhor;
}
@faltam = grep { !$fix{$_} } @faltam;
die "municípios do TSE sem malha: @faltam\n" if @faltam;
for my $nr (keys %VM) { for my $c (keys %{$VM{$nr}}) { if (my $n = $fix{$c}) { $VM{$nr}{$n} += delete $VM{$nr}{$c} } } }
$A{mapa} = { w => $Wd, h => $Ht, mun => \@mapa, ajustes => \%fix };

# ---------- fotos ----------
my %fotos;
for my $sq (keys %cand) {
    my $f = "$W/painel/fotos/FSC${sq}_div.jpg";
    next unless -f $f;
    open my $h, '<:raw', $f or die; local $/; $fotos{$cand{$sq}{nr}} = 'data:image/jpeg;base64,' . encode_base64(<$h>, ''); close $h;
}
$A{fotos} = \%fotos;
$A{cand} = { map { $cand{$_}{nr} => $cand{$_} } keys %cand };

# ---------- Instagram ----------
sub csv_semicolon {
    my ($t) = @_; my (@rows, @row, $f, $q); $f = ''; $q = 0;
    for my $ch (split //, $t) {
        if ($q) { if ($ch eq '"') { $q = 0 } else { $f .= $ch } next }
        if ($ch eq '"') { if ($f =~ /"$/) { } $q = 1; next }
        if ($ch eq ';') { push @row, $f; $f = ''; next }
        if ($ch eq "\n") { push @row, $f; push @rows, [@row] if grep { length } @row; @row = (); $f = ''; next }
        next if $ch eq "\r";
        $f .= $ch;
    }
    push @row, $f; push @rows, [@row] if grep { length } @row;
    @rows;
}
my %ig;
my %esperado = (cris_quadros => 19, martina_domingues => 151, sargento_floriano => 84);
for my $p (sort keys %esperado) {
    my @r = csv_semicolon(rd("../Instagram_Publicacoes_${p}_Campanha2026_coleta_2026-11-24.csv"));
    my $hd = shift @r;
    my @posts;
    for my $r (@r) {
        my %x; @x{@$hd} = @$r;
        my ($d, $m, $y, $H, $M, $S) = $x{data_hora_brasilia} =~ m{(\d\d)/(\d\d)/(\d{4}), (\d\d):(\d\d):(\d\d)} or die "data: $x{data_hora_brasilia}";
        push @posts, { d => "$y-$m-$d", h => "$H:$M:$S", tipo => $x{tipo}, cur => $x{curtidas} || 0, com => $x{comentarios} || 0,
                       url => $x{url}, leg => $x{legenda} // '', marc => $x{marcados} // '', coaut => $x{coautores} // '', local => $x{local} // '' };
    }
    die "Instagram $p: esperado $esperado{$p}, lido " . scalar(@posts) . "\n" unless @posts == $esperado{$p};
    $ig{$p} = [ sort { "$a->{d} $a->{h}" cmp "$b->{d} $b->{h}" } @posts ];
}
$A{instagram} = \%ig;

# ---------- grava ----------
open my $o, '>:encoding(UTF-8)', 'dados/dados_auto.js' or die "dados/dados_auto.js: $!";
print $o "// Gerado por _scripts/02_painel_dados.pl – não editar à mão.\nconst A = " . js(\%A) . ";\n";
close $o;
printf "ok: %d candidaturas, %d na urna (%d mulheres), %d municípios na malha (ajustes: %s), %d fotos, Instagram %s\n",
    scalar(keys %cand), scalar(@met), $nF, scalar(@mapa), join(',', map { "$_=>$fix{$_}" } sort keys %fix) || 'nenhum', scalar(keys %fotos),
    join(' ', map { "$_=" . scalar(@{$ig{$_}}) } sort keys %ig);
