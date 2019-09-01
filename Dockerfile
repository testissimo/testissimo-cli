FROM ubuntu:18.04
# FROM alpine:3.10

COPY ./dist/testissimo-cli /testissimo-cli

ENTRYPOINT ["/testissimo-cli"]