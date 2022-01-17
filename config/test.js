const dotenv = require('dotenv')

dotenv.config({
  path: ".env"
})

module.exports = {
  server: {
    port: 3000,
    host: "localhost",
  },
  database: {
    type: "postgres",
    port: 5432,
    username: "postgres",
    password: "",
    host: "localhost",
    name: "redenomination-test",
  },
  admin: {
    password: "test_password"
  },
  jwt: {
    key: "+Qw2LnE8mn%Q-8hZtH4q$T_fq3T_H=wKpkWh@C2=XQVc6jEGAWjs6ZY*CdL-tQ9^X+NbcR4$$$e5uJJAK^M?_4JAkUe*7BD_*S%mtN?f%nbHe2snHy$Xg?aypchF$vkwbysDf2s5kpk%yL&5f7%u!HYuq!y=wyVF2ug=bgGR5M*8C_d2N&^&6mPbLuqvFNWPtcJwCMN8XXsgbD$+xTD?_$UyPQ5P6Grq=AA59sNfp2eYp@NY_N5%Ux%fP=6EshyVuG%XM=Q3*@Mup&F-dRH!?Mp+!^5*6_EfX+@uvB@W7K9e2X=%=TMSfXpa7-2?DABf4tqnuJB^QGrfG3=t=6#VCsLWD&WQTENSkUeY76uD5bak=Dp9pWbG4YJjg^4xGRUc5E^W=6sVu*JyW5MXjG4LQ*3AQkpjjvHm$7fF#5y9WzJWhX2R@6=2p_yf_bA5=JEkGN*?m8@J5#wEVvBut#GKJVnY6jQ?NAJm=3VCJ^xG4$keCb3^p?9N9hc2FeBT*a8uxm^vX$Br+5u=HY3WU*^u3ArzZM54btwS8X@@KFaM+Weu%E2AzQraCe+Zq+NPyqzXWbJ3g#XBQc5XsaFC+7%^-B%Yghk6XQgP5jF=9?D8w?kjCpWaqA5LpvQMWQK!=+DzqJuNt!QRFU5UrtBHB-hs3%5AX5nt5@gfZqP@yx68VP_HNyaDd+3kYBBSTzR6NYW%Fr_E6V!knEpT8y%skaJacb7DFS$D-E-k8HEaw@4Y*8rq-*P6h?qk9eF^jmFVwPAB3^U!_!4AL2GkXaVk-g*TtJ+fr^?9H*6DzuEJ-zV&Fu&k8cMZbm$5Bjwp^UEP9tCWa9+Pg$RRJ%GzDs%X5T9Jk?z^tce%UjBu-zQXJ6pyRbGc7Km92R%-%fBDaU3%dK%WJyEeQtd-qSrM_nM2wE+bR&Hp5xs5X%wgYqmM$heC!EAFkcceb!G3HE&Wh9crfHK+Dabh4VsMwP3sgeG4VuKAR-=J8S6B2aEWxm5vrDbs4D65^YX53VQgpqk__&T74@yqzmFMbvn&xcm#RELktD7PDpc9$^a!t^jVexGNfP?Zm4pNtc?e#-vb#q%Ev#aSVSzsTd=Z&jT&_FJdSQ2qmYQCbnN!v3xK=AMbgZEw7LrrF6xmZHR8RJAdD@v=h%vNbjq!s%Pk_aU%3VLKg+^52AzrnXpb-pcxHnZBJt!Af^LuGxq4J+duZcPzEMsTkMEAKL6dj5n2Gnk^-SHWbY!#P!6zwtjVbjG$eC3T@$tWcAy@V^ygZ$cccYjE!cs_7_d_ndgzP5^-!Ny-Z&$f*425Zce^T*U=%+DKYz@qz5+^fDv88uXDze*hQnWTruPnU3Jh^2PWLKYQtkQx&eWr5$uUDEWtSB?6ESMGY8n+p7JT%brVJs_MkuG2vrhFv3PR7A*ttGa=5P2zKKffT3?RLvuLwv6M%_@u8DmJdRqztEn9^x9c+u_TRDFGTeHtb9qS^vsRv6jjx^nNB_-w?wQnMLzvHTaeyrcQ+D!w-sug+JDRZ!PKUNgQb$9a8Kz+Jc$w%DkqM^UJRAUpX4!69%9fJfV9Ty?!m??mb5MX2dCjCr4qcKeLP%TmGw%Fw2kHX4gbdUNGA$grS=sapZNXbPth*k_WWd6KutL+7RENj+F$_ELs72+8za4SBczZy=!WNFtH?CE$c9jz*=S$9Zt-HP?PC7S7G-G=_C@w*UMP_r&jx!PrFst@DGHaKNxJmDRc#XYu$eQQ^b!P6?dBnYnZN-TexmzFzrMKh=HR+87&BPt55Fe=&?HC*?@j4e%=%+tMhN9&jzXMQLEYG-93jU_&dnKVW5F+7HbTw*cajDWFh3jKkp4SYtCWBUUV*uzNRXeC#uKGM_+!FdTFh_a!7$YugR_!-w_yLU!7!sDVj5Yf6_r-NR_?Rabkdw_tkB_A7LUJbRJ%T@Khbag3$sMDuMV8ZuMV9ae4yZzYK%N65WRD%$SnJBD9wJfWK8cM#XJ5Mj%Z?nrEhH9MD@sw9UkR@L9M+3&V&QcR^eR^8hfbYg=7g&uCvjh*-xPpVbtfEyEc+SqsNLpJhet8!rv@"
  },
  postmanApiKey: process.env.POSTMAN_API_KEY
};