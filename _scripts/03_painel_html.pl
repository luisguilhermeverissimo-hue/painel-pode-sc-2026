#!/usr/bin/perl
# Painel da chapa estadual do PODE/SC – montagem do HTML autocontido.
# uso (a partir da subpasta "PAINEL - PODE SC"):
#   perl -CSD _scripts/02_painel_dados.pl      (dados automáticos)
#   perl -CSD _scripts/03_painel_html.pl       (gera Painel_Chapa_Estadual_PODE_SC_Novo_2026.html)
use strict; use warnings; use utf8; use MIME::Base64; use POSIX qw(strftime);

my $SK = "$ENV{USERPROFILE}/.claude/skills/identidade-visual-monteiro/assets";
my $SAIDA = 'Painel_Chapa_Estadual_PODE_SC_Novo_2026.html';
sub rd  { my ($f) = @_; open my $h, '<:encoding(UTF-8)', $f or die "$f: $!"; local $/; my $t = <$h>; close $h; $t =~ s/^\x{FEFF}//; $t }
sub b64 { my ($f) = @_; open my $h, '<:raw', $f or die "$f: $!"; local $/; my $t = encode_base64(<$h>, ''); close $h; $t }

my %R = (
    FONTE   => b64("$SK/fonts/Outfit-VariableFont.ttf"),
    LOGO    => b64("$SK/logos/logo-horizontal-cor.svg"),
    SIMBOLO => b64("$SK/logos/simbolo-cor.svg"),
    CSS     => rd('_scripts/painel.css'),
    APP     => rd('_scripts/painel.js'),
    DADOS_AUTO    => rd('dados/dados_auto.js'),
    DADOS_MANUAIS => rd('dados/dados_manuais.js'),
    GERADO  => strftime('%d/%m/%Y %H:%M', localtime),
);
for (qw(APP DADOS_AUTO DADOS_MANUAIS)) { die "$_ contém </script>\n" if $R{$_} =~ m{</script}i }

my $t = rd('_scripts/painel.template.html');
$t =~ s/\{\{(\w+)\}\}/exists $R{$1} ? $R{$1} : die "marcador desconhecido: $1\n"/ge;
open my $o, '>:encoding(UTF-8)', $SAIDA or die "$SAIDA: $!";
print $o $t; close $o;
printf "ok: %s (%.1f MB)\n", $SAIDA, (-s $SAIDA) / 1048576;
